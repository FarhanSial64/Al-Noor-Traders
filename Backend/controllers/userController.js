const User = require('../models/User');
const Customer = require('../models/Customer');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { createAuditLog } = require('../middleware/auditLogger');
const { ROLES } = require('../config/roles');
const { sendPasswordResetLinkEmail, sendNewUserCredentials } = require('../services/emailService');
const crypto = require('crypto');

/**
 * User Controller
 * 
 * Handles user management (Distributor only)
 */

// @desc    Get all users
// @route   GET /api/users
// @access  Distributor only
exports.getUsers = async (req, res) => {
  try {
    const { role, isActive, search, page = 1, limit = 50 } = req.query;

    const query = {};
    
    // Don't show distributor to other users
    if (req.user.role !== ROLES.DISTRIBUTOR) {
      query.role = { $ne: ROLES.DISTRIBUTOR };
    }

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('customerId', 'businessName customerCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Distributor only
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('customerId', 'businessName customerCode phone address');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Distributor only
exports.createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      role,
      phone,
      assignedArea,
      linkedCustomerId
    } = req.body;

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.username === username 
          ? 'Username already exists' 
          : 'Email already exists'
      });
    }

    // If creating customer user, verify customer exists
    if (role === ROLES.CUSTOMER && linkedCustomerId) {
      const customer = await Customer.findById(linkedCustomerId);
      if (!customer) {
        return res.status(400).json({
          success: false,
          message: 'Linked customer not found'
        });
      }
    }

    const user = await User.create({
      username,
      email,
      password,
      fullName,
      role,
      phone,
      assignedArea,
      customerId: linkedCustomerId,
      mustChangePassword: true  // Force password change on first login
    });

    // Send welcome email with credentials
    let emailSent = false;
    try {
      await sendNewUserCredentials({ email, fullName, username, role }, password);
      emailSent = true;
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail user creation if email fails
    }

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      module: 'user',
      entityType: 'User',
      entityId: user._id,
      description: `Created user: ${username} (${role})${emailSent ? ' - Credentials sent via email' : ''}`,
      performedBy: req.user._id,
      performedByName: req.user.fullName || req.user.username,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'User created successfully. Login credentials have been sent to their email.' 
        : 'User created successfully. Note: Email could not be sent.',
      emailSent,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Distributor only
exports.updateUser = async (req, res) => {
  try {
    const { email, fullName, role, phone, assignedArea, isActive, linkedCustomerId } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot modify distributor
    if (user.role === ROLES.DISTRIBUTOR && req.user._id !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify distributor account'
      });
    }

    // Check email uniqueness if changing
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Track changes for audit
    const changes = {};
    if (email && email !== user.email) changes.email = { from: user.email, to: email };
    if (fullName && fullName !== user.fullName) changes.fullName = { from: user.fullName, to: fullName };
    if (role && role !== user.role) changes.role = { from: user.role, to: role };
    if (isActive !== undefined && isActive !== user.isActive) changes.isActive = { from: user.isActive, to: isActive };

    // Update fields
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (assignedArea !== undefined) user.assignedArea = assignedArea;
    if (isActive !== undefined) user.isActive = isActive;
    if (linkedCustomerId) user.customerId = linkedCustomerId;

    await user.save();

    // Audit log
    if (Object.keys(changes).length > 0) {
      await createAuditLog({
        action: 'UPDATE',
        module: 'user',
        entityType: 'User',
        entityId: user._id,
        description: `Updated user: ${user.username}`,
        previousValues: changes,
        performedBy: req.user._id,
        performedByName: req.user.fullName || req.user.username,
        performedByRole: req.user.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
};

// @desc    Deactivate user (soft delete)
// @route   DELETE /api/users/:id
// @access  Distributor only
exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cannot delete distributor
    if (user.role === ROLES.DISTRIBUTOR) {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate distributor account'
      });
    }

    user.isActive = false;
    await user.save();

    // Audit log
    await createAuditLog({
      action: 'DEACTIVATE',
      module: 'user',
      entityType: 'User',
      entityId: user._id,
      description: `Deactivated user: ${user.username}`,
      performedBy: req.user._id,
      performedByName: req.user.fullName || req.user.username,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating user'
    });
  }
};

// @desc    Reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Distributor only
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    // Audit log
    await createAuditLog({
      action: 'PASSWORD_RESET',
      module: 'user',
      entityType: 'User',
      entityId: user._id,
      description: `Password reset for user: ${user.username}`,
      performedBy: req.user._id,
      performedByName: req.user.fullName || req.user.username,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
};

// @desc    Get all order bookers
// @route   GET /api/users/role/order-bookers
// @access  Distributor, Computer Operator
exports.getOrderBookers = async (req, res) => {
  try {
    const orderBookers = await User.find({
      role: ROLES.ORDER_BOOKER,
      isActive: true
    })
    .select('fullName username phone assignedArea')
    .sort({ fullName: 1 });

    res.json({
      success: true,
      data: orderBookers
    });
  } catch (error) {
    console.error('Get order bookers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order bookers'
    });
  }
};

// @desc    Get all password reset requests
// @route   GET /api/users/password-reset-requests
// @access  Distributor only
exports.getPasswordResetRequests = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const requests = await PasswordResetRequest.find(query)
      .populate('user', 'fullName username email role phone')
      .populate('processedBy', 'fullName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get password reset requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching password reset requests'
    });
  }
};

// @desc    Get password reset requests count (for notification badge)
// @route   GET /api/users/password-reset-requests/count
// @access  Distributor only
exports.getPasswordResetRequestsCount = async (req, res) => {
  try {
    const count = await PasswordResetRequest.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get password reset requests count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Generate secure reset token
const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  // Hash token for storage (unhashed token is sent to user)
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashedToken };
};

// @desc    Process password reset request (approve/reject)
// @route   PUT /api/users/password-reset-requests/:id
// @access  Distributor only
exports.processPasswordResetRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approve or reject.'
      });
    }

    const request = await PasswordResetRequest.findById(id).populate('user');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Password reset request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    if (action === 'reject') {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason || 'Request rejected by administrator';
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save();

      await createAuditLog({
        action: 'REJECT',
        module: 'user',
        entityType: 'PasswordResetRequest',
        entityId: request._id,
        description: `Password reset request rejected for ${request.user.fullName}`,
        performedBy: req.user._id,
        performedByName: req.user.fullName,
        performedByRole: req.user.role,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success'
      });

      return res.json({
        success: true,
        message: 'Password reset request rejected'
      });
    }

    // Approve - Generate reset token and send email with secure link
    const { token, hashedToken } = generateResetToken();
    const resetExpires = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes
    
    const user = await User.findById(request.user._id);
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = resetExpires;
    await user.save({ validateModifiedOnly: true });

    // Update request status
    request.status = 'approved';
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    await request.save();

    // Build reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;

    // Send email with reset link
    try {
      await sendPasswordResetLinkEmail(user, resetUrl);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue anyway - the token is set
    }

    // Audit log
    await createAuditLog({
      action: 'APPROVE',
      module: 'user',
      entityType: 'User',
      entityId: user._id,
      description: `Password reset approved for ${user.fullName}`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: `Password reset link has been sent to ${user.email}. The link will expire in 20 minutes.`,
      data: {
        email: user.email
      }
    });
  } catch (error) {
    console.error('Process password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request'
    });
  }
};
