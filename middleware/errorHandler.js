const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      details: 'Image must be less than 5MB'
    });
  }

  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      details: 'Only image files are allowed'
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

module.exports = errorHandler;
