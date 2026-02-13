const BusinessSettings = require('../models/BusinessSettings');
const { createAuditLog } = require('../middleware/auditLogger');
const { ROLES } = require('../config/roles');

/**
 * Business Settings Controller
 * 
 * Handles business settings for distributor
 */

// @desc    Get business settings
// @route   GET /api/settings/business
// @access  Private (All authenticated users)
exports.getBusinessSettings = async (req, res) => {
  try {
    const settings = await BusinessSettings.getSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get business settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching business settings'
    });
  }
};

// @desc    Update business settings
// @route   PUT /api/settings/business
// @access  Private (Distributor only)
exports.updateBusinessSettings = async (req, res) => {
  try {
    const {
      businessName,
      tagline,
      address,
      phone,
      email,
      website,
      ntn,
      strn,
      cnic,
      bankDetails,
      logo,
      invoiceSettings,
      receiptSettings
    } = req.body;

    let settings = await BusinessSettings.getSettings();

    // Update fields
    if (businessName) settings.businessName = businessName;
    if (tagline !== undefined) settings.tagline = tagline;
    if (address) settings.address = { ...settings.address, ...address };
    if (phone) settings.phone = { ...settings.phone, ...phone };
    if (email !== undefined) settings.email = email;
    if (website !== undefined) settings.website = website;
    if (ntn !== undefined) settings.ntn = ntn;
    if (strn !== undefined) settings.strn = strn;
    if (cnic !== undefined) settings.cnic = cnic;
    if (bankDetails) settings.bankDetails = bankDetails;
    if (logo !== undefined) settings.logo = logo;
    if (invoiceSettings) settings.invoiceSettings = { ...settings.invoiceSettings, ...invoiceSettings };
    if (receiptSettings) settings.receiptSettings = { ...settings.receiptSettings, ...receiptSettings };
    
    settings.updatedBy = req.user._id;
    settings.distributor = req.user._id;

    await settings.save();

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      module: 'settings',
      entityType: 'BusinessSettings',
      entityId: settings._id,
      description: 'Business settings updated',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Business settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update business settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating business settings'
    });
  }
};
