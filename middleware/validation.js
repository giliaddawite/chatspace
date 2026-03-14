/**
 * Validation Middleware
 * Validates request body for room creation
 */

const validateRoomCreation = (req, res, next) => {
  const { name, description, is_private, max_members } = req.body;
  const errors = [];

  // Validate name (required, 3-50 characters)
  if (!name || typeof name !== 'string') {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: 'Room name is required',
      field: 'name',
    });
  } else if (name.trim().length < 3) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: 'Room name must be at least 3 characters',
      field: 'name',
    });
  } else if (name.trim().length > 50) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: 'Room name must not exceed 50 characters',
      field: 'name',
    });
  }

  // Validate description (optional, max 200 characters)
  if (description !== undefined) {
    if (typeof description !== 'string') {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Description must be a string',
        field: 'description',
      });
    } else if (description.length > 200) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Description must not exceed 200 characters',
        field: 'description',
      });
    }
  }

  // Validate is_private (optional, boolean)
  if (is_private !== undefined && typeof is_private !== 'boolean') {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: 'is_private must be a boolean',
      field: 'is_private',
    });
  }

  // Validate max_members (optional, positive integer)
  if (max_members !== undefined) {
    if (!Number.isInteger(max_members) || max_members < 1) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: 'max_members must be a positive integer',
        field: 'max_members',
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors[0], // Return first error
    });
  }

  // Sanitize and attach to request
  req.validatedData = {
    name: name.trim(),
    description: description ? description.trim() : null,
    is_private: is_private || false,
    max_members: max_members || null,
  };

  next();
};

module.exports = { validateRoomCreation };

