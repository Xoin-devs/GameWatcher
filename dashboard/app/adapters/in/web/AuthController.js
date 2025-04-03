/**
 * Controller for authentication-related web routes
 */
class AuthController {
    /**
     * Render login page
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    renderLogin(req, res, next) {
        try {
            // If user is already logged in, redirect to dashboard
            if (req.isAuthenticated()) {
                return res.redirect('/dashboard');
            }
            res.render('login');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle logout
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    handleLogout(req, res, next) {
        try {
            req.logout((err) => {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Auth callback handler
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    handleAuthCallback(req, res, next) {
        try {
            res.redirect('/dashboard');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;