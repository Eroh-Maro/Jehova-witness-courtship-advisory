import ApiError from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';

/**
 * Restrict a route to a specific set of roles.
 * Usage:
 * router.delete(
 *   '/:id',
 *   protect,
 *   authorize(ROLES.SUPER_ADMIN),
 *   controller
 * );
 */
export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.admin) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (!allowedRoles.includes(req.admin.role)) {
    return next(
      ApiError.forbidden(
        'You do not have permission to perform this action'
      )
    );
  }

  next();
};

export const isSuperAdmin = authorize(ROLES.SUPER_ADMIN);

export const isAdminOrAbove = authorize(
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN
);

/**
 * Restricts access based on an admin's assigned countries.
 *
 * Super Admins and admins with international access pass automatically.
 *
 * Usage:
 * authorizeCountryAccess(req => req.params.country)
 * authorizeCountryAccess(req => req.body.country)
 * authorizeCountryAccess('NG')
 */
export const authorizeCountryAccess = (countryOrGetter) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const { admin } = req;

    if (
      admin.role === ROLES.SUPER_ADMIN ||
      admin.canHandleInternational === true
    ) {
      return next();
    }

    const requestedCountry =
      typeof countryOrGetter === 'function'
        ? countryOrGetter(req)
        : countryOrGetter;

    if (
      typeof requestedCountry !== 'string' ||
      !requestedCountry.trim()
    ) {
      return next(ApiError.badRequest('Country is required'));
    }

    const normalizedCountry = requestedCountry
      .trim()
      .toUpperCase();

    const assignedCountries = Array.isArray(admin.assignedCountries)
      ? admin.assignedCountries
      : [];

    if (!assignedCountries.includes(normalizedCountry)) {
      return next(
        ApiError.forbidden(
          'You are not authorized to access data for this country'
        )
      );
    }

    next();
  };
};

/**
 * Permission-based gate that reads dynamic booleans from platform settings.
 * Falls back to allow for Super Admins and Admins.
 */
export const permissionGate = (settingPath) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return next(
          ApiError.unauthorized('Authentication required')
        );
      }

      if (
        [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.admin.role)
      ) {
        return next();
      }

      const { getSettings } = await import(
        '../models/Setting.js'
      );

      const settings = await getSettings();
      const settingsObject = settings.toObject();

      const allowed = settingPath
        .split('.')
        .reduce(
          (currentValue, key) => currentValue?.[key],
          settingsObject
        );

      if (!allowed) {
        return next(
          ApiError.forbidden(
            'You do not have permission to perform this action'
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};