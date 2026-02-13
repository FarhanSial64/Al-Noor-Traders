// Role-Based Access Control Configuration
// Defines permissions for each user role

const ROLES = {
  DISTRIBUTOR: 'distributor',
  COMPUTER_OPERATOR: 'computer_operator',
  ORDER_BOOKER: 'order_booker',
  CUSTOMER: 'customer'
};

const PERMISSIONS = {
  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Product Management
  PRODUCT_CREATE: 'product:create',
  PRODUCT_READ: 'product:read',
  PRODUCT_READ_MASTER: 'product:read_master', // For categories, brands, units
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',

  // Customer Management
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_READ: 'customer:read',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_DELETE: 'customer:delete',

  // Vendor Management
  VENDOR_CREATE: 'vendor:create',
  VENDOR_READ: 'vendor:read',
  VENDOR_UPDATE: 'vendor:update',
  VENDOR_DELETE: 'vendor:delete',

  // Order Management
  ORDER_CREATE: 'order:create',
  ORDER_READ: 'order:read',
  ORDER_READ_OWN: 'order:read_own',
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',
  ORDER_APPROVE: 'order:approve',
  ORDER_MANAGE_RETURNS: 'order:manage_returns',

  // Purchase Management
  PURCHASE_CREATE: 'purchase:create',
  PURCHASE_READ: 'purchase:read',
  PURCHASE_UPDATE: 'purchase:update',
  PURCHASE_DELETE: 'purchase:delete',

  // Inventory Management
  INVENTORY_READ: 'inventory:read',
  INVENTORY_ADJUST: 'inventory:adjust',

  // Invoice Management
  INVOICE_CREATE: 'invoice:create',
  INVOICE_READ: 'invoice:read',
  INVOICE_READ_OWN: 'invoice:read_own',
  INVOICE_UPDATE: 'invoice:update',
  INVOICE_DELETE: 'invoice:delete',

  // Finance & Accounting
  FINANCE_FULL_ACCESS: 'finance:full',
  FINANCE_PAYMENT_ENTRY: 'finance:payment_entry',
  FINANCE_RECEIPT_ENTRY: 'finance:receipt_entry',
  FINANCE_VIEW_LEDGER: 'finance:view_ledger',
  FINANCE_VIEW_OWN_BALANCE: 'finance:view_own_balance',
  FINANCE_VIEW_REPORTS: 'finance:view_reports',
  FINANCE_VIEW_TRIAL_BALANCE: 'finance:view_trial_balance',
  FINANCE_VIEW_PL: 'finance:view_pl',

  // Reports
  REPORT_SALES: 'report:sales',
  REPORT_STOCK: 'report:stock',
  REPORT_FINANCIAL: 'report:financial',

  // Audit
  AUDIT_VIEW: 'audit:view'
};

// Role-Permission Mapping
const ROLE_PERMISSIONS = {
  [ROLES.DISTRIBUTOR]: [
    // Full access to everything
    ...Object.values(PERMISSIONS)
  ],

  [ROLES.COMPUTER_OPERATOR]: [
    // Product Management
    PERMISSIONS.PRODUCT_CREATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.PRODUCT_READ_MASTER,
    PERMISSIONS.PRODUCT_UPDATE,

    // Customer Management
    PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.CUSTOMER_READ,
    PERMISSIONS.CUSTOMER_UPDATE,

    // Vendor Management
    PERMISSIONS.VENDOR_CREATE,
    PERMISSIONS.VENDOR_READ,
    PERMISSIONS.VENDOR_UPDATE,

    // Order Management
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ORDER_APPROVE,
    PERMISSIONS.ORDER_MANAGE_RETURNS,

    // Purchase Management
    PERMISSIONS.PURCHASE_CREATE,
    PERMISSIONS.PURCHASE_READ,
    PERMISSIONS.PURCHASE_UPDATE,

    // Inventory
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST,

    // Invoice
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_UPDATE,

    // Finance (Limited - can enter but not delete)
    PERMISSIONS.FINANCE_PAYMENT_ENTRY,
    PERMISSIONS.FINANCE_RECEIPT_ENTRY,
    PERMISSIONS.FINANCE_VIEW_LEDGER,
    PERMISSIONS.FINANCE_VIEW_REPORTS,

    // Reports
    PERMISSIONS.REPORT_SALES,
    PERMISSIONS.REPORT_STOCK
  ],

  [ROLES.ORDER_BOOKER]: [
    // Product (Read only)
    PERMISSIONS.PRODUCT_READ,

    // Customer (Read only)
    PERMISSIONS.CUSTOMER_READ,

    // Order Management
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_READ_OWN,

    // Invoice (Read own)
    PERMISSIONS.INVOICE_READ_OWN,

    // Inventory (Read only)
    PERMISSIONS.INVENTORY_READ,

    // Finance - Receipt only (order booker collects cash from customers)
    PERMISSIONS.FINANCE_RECEIPT_ENTRY
  ],

  [ROLES.CUSTOMER]: [
    // Product (Read only)
    PERMISSIONS.PRODUCT_READ,

    // Order (Own only)
    PERMISSIONS.ORDER_READ_OWN,

    // Invoice (Own only)
    PERMISSIONS.INVOICE_READ_OWN,

    // Finance (Own balance only)
    PERMISSIONS.FINANCE_VIEW_OWN_BALANCE
  ]
};

// Check if role has permission
const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

// Get all permissions for a role
const getPermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissions
};
