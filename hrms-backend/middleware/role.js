const role = (roles) => (req, res, next) => {
    if (!roles.includes(req.user.loginType)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
  
  module.exports = role;