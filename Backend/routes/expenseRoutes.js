const router = require('express').Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

// All routes require authentication
router.use(authenticate);

// ========== EXPENSE ACCOUNTS ==========
// Get expense accounts for dropdown
router.get('/accounts', expenseController.getExpenseAccounts);

// ========== EXPENSE CATEGORIES ==========
// Category routes - Distributor and Computer Operator can manage
router.get('/categories', expenseController.getCategories);
router.post('/categories', authorizeRoles('distributor', 'computer_operator'), expenseController.createCategory);
router.put('/categories/:id', authorizeRoles('distributor', 'computer_operator'), expenseController.updateCategory);
router.delete('/categories/:id', authorizeRoles('distributor', 'computer_operator'), expenseController.deleteCategory);

// ========== EXPENSE SUMMARY ==========
router.get('/summary', expenseController.getExpenseSummary);

// ========== EXPENSES ==========
// Main expense routes
router.get('/', expenseController.getExpenses);
router.get('/:id', expenseController.getExpense);
router.post('/', authorizeRoles('distributor', 'computer_operator'), expenseController.createExpense);
router.put('/:id', authorizeRoles('distributor', 'computer_operator'), expenseController.updateExpense);
router.delete('/:id', authorizeRoles('distributor', 'computer_operator'), expenseController.deleteExpense);

module.exports = router;
