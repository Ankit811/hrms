const role = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Access denied: No user data available' });
  }

  if (!req.user.loginType) {
    return res.status(403).json({ message: 'Access denied: User loginType not specified' });
  }

  if (!roles.includes(req.user.loginType)) {
    return res.status(403).json({
      message: `Access denied: User loginType '${req.user.loginType}' is not one of the allowed roles: ${roles.join(', ')}`,
    });
  }

  next();
};

module.exports = role;