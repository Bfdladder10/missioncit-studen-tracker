// Role-based access control middleware

// Role middleware - ensure user has specific role
function roleMiddleware(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden' });
    }
    
    next();
  };
}

module.exports = {
  roleMiddleware
};
