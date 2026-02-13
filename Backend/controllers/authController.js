const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { generateToken } = require('../middleware/auth');
const { createAuditLog } = require('../middleware/auditLogger');
const { ROLES } = require('../config/roles');
const { sendPasswordResetRequestNotification } = require('../services/emailService');
const crypto = require('crypto');

/**
 * Auth Controller
 * Handles authentication operations
 */

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user (include password for comparison)
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    }).select('+password');

    if (!user) {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        module: 'auth',
        description: `Failed login attempt for username: ${username}`,
        performedBy: null,
        performedByName: username,
        performedByRole: 'unknown',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'failure',
        errorMessage: 'User not found'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        module: 'auth',
        description: `Failed login attempt for username: ${username}`,
        performedBy: user._id,
        performedByName: user.fullName,
        performedByRole: user.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'failure',
        errorMessage: 'Invalid password'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Audit log
    await createAuditLog({
      action: 'LOGIN',
      module: 'auth',
      description: `User ${user.fullName} logged in`,
      performedBy: user._id,
      performedByName: user.fullName,
      performedByRole: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          profilePicture: user.profilePicture,
          mustChangePassword: user.mustChangePassword || false
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Register new user (by admin/distributor)
// @route   POST /api/auth/register
// @access  Private (Distributor only)
exports.register = async (req, res) => {
  try {
    // Only distributor can create users
    if (req.user.role !== ROLES.DISTRIBUTOR) {
      return res.status(403).json({
        success: false,
        message: 'Only distributors can create new users'
      });
    }

    const { username, email, password, fullName, role, phone, address, assignedAreas } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      fullName,
      role,
      phone,
      address,
      assignedAreas: assignedAreas || [],
      createdBy: req.user._id
    });

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      module: 'user',
      entityType: 'User',
      entityId: user._id,
      description: `Created new user: ${user.fullName} (${user.role})`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('customerId');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, address, profilePicture } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customerId');

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      module: 'auth',
      entityType: 'User',
      entityId: user._id,
      description: 'Profile updated',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      module: 'auth',
      entityType: 'User',
      entityId: user._id,
      description: 'Password changed',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Audit log
    await createAuditLog({
      action: 'LOGOUT',
      module: 'auth',
      description: `User ${req.user.fullName} logged out`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Customer self-registration (signup)
// @route   POST /api/auth/customer-signup
// @access  Public
exports.customerSignup = async (req, res) => {
  try {
    const { username, email, password, fullName, phone, businessName, address } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Create the customer record first
    const Customer = require('../models/Customer');
    
    // Generate customer code
    const count = await Customer.countDocuments();
    const customerCode = `CUST${String(count + 1).padStart(5, '0')}`;
    
    const customer = await Customer.create({
      customerCode,
      businessName,
      contactPerson: fullName,
      email,
      phone,
      address: {
        street: address,
        city: '',
        area: ''
      },
      businessType: 'retailer',
      creditLimit: 0,
      currentBalance: 0,
      isActive: true
    });

    // Create user with customer role
    const user = await User.create({
      username,
      email,
      password,
      fullName,
      role: ROLES.CUSTOMER,
      phone,
      address,
      customerId: customer._id,
      isActive: true
    });

    // Link user to customer
    customer.linkedUser = user._id;
    await customer.save();

    // Generate token for auto-login
    const token = generateToken(user._id);

    // Audit log
    await createAuditLog({
      action: 'SIGNUP',
      module: 'auth',
      entityType: 'User',
      entityId: user._id,
      description: `New customer signed up: ${fullName} (${businessName})`,
      performedBy: user._id,
      performedByName: fullName,
      performedByRole: ROLES.CUSTOMER,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          customerId: customer._id
        }
      }
    });
  } catch (error) {
    console.error('Customer signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup'
    });
  }
};

// @desc    Request password reset (public endpoint for order bookers/computer operators)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { username, reason } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that username or email'
      });
    }

    // Only order bookers and computer operators can request password reset
    if (![ROLES.ORDER_BOOKER, ROLES.COMPUTER_OPERATOR].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Password reset is only available for Order Bookers and Computer Operators'
      });
    }

    // Check if there's already a pending request
    const existingRequest = await PasswordResetRequest.findOne({
      user: user._id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending password reset request. Please wait for the administrator to process it.'
      });
    }

    // Create password reset request
    const resetRequest = await PasswordResetRequest.create({
      user: user._id,
      reason: reason || 'Password reset requested'
    });

    // Find distributor to notify
    const distributor = await User.findOne({ role: ROLES.DISTRIBUTOR, isActive: true });
    
    if (distributor) {
      try {
        await sendPasswordResetRequestNotification(distributor, user, reason);
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Audit log
    await createAuditLog({
      action: 'PASSWORD_RESET_REQUEST',
      module: 'auth',
      entityType: 'PasswordResetRequest',
      entityId: resetRequest._id,
      description: `Password reset requested by ${user.fullName}`,
      performedBy: user._id,
      performedByName: user.fullName,
      performedByRole: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Password reset request submitted successfully. The administrator will review your request and you will receive an email with your new password.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request'
    });
  }
};

// @desc    Force change password (for users who have mustChangePassword flag)
// @route   PUT /api/auth/force-change-password
// @access  Private
exports.forceChangePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user.mustChangePassword) {
      return res.status(400).json({
        success: false,
        message: 'Password change not required'
      });
    }

    // Update password and clear the flag
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    // Audit log
    await createAuditLog({
      action: 'PASSWORD_RESET',
      module: 'auth',
      entityType: 'User',
      entityId: user._id,
      description: 'User changed password after first login or reset',
      performedBy: user._id,
      performedByName: user.fullName,
      performedByRole: user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Force change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

// @desc    Verify password reset token
// @route   GET /api/auth/verify-reset-token/:token
// @access  Public
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('fullName username email');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link. Please request a new password reset.'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        fullName: user.fullName,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error verifying reset token'
    });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPasswordWithToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+password +passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link. Please request a new password reset.'
      });
    }

    // Update password and clear reset token fields
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    // Audit log
    await createAuditLog({
      action: 'PASSWORD_RESET',
      module: 'auth',
      entityType: 'User',
      entityId: user._id,
      description: `Password reset completed via secure link for ${user.fullName}`,
      performedBy: user._id,
      performedByName: user.fullName,
      performedByRole: user.role,
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password with token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
};
