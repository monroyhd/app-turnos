const User = require('../models/user');
const { generateToken } = require('../middleware/auth');
const Joi = require('joi');

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const authController = {
  async login(req, res, next) {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { username, password } = value;

      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales invalidas'
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Usuario inactivo'
        });
      }

      const validPassword = await User.verifyPassword(user, password);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales invalidas'
        });
      }

      const token = generateToken(user);

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            full_name: user.full_name
          }
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res) {
    res.json({
      success: true,
      message: 'Logout exitoso'
    });
  },

  async register(req, res, next) {
    try {
      const schema = Joi.object({
        username: Joi.string().min(3).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        full_name: Joi.string().max(100),
        role: Joi.string().valid('admin', 'capturista', 'medico', 'display', 'admin_recurso', 'pan_recurso')
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const existingUser = await User.findByUsername(value.username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El nombre de usuario ya existe'
        });
      }

      const existingEmail = await User.findByEmail(value.email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'El email ya esta registrado'
        });
      }

      const user = await User.create(value);

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: user
      });
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const filters = {
        role: req.query.role,
        is_active: req.query.is_active === 'true' ? true :
                   req.query.is_active === 'false' ? false : undefined
      };

      const users = await User.findAll(filters);

      res.json({
        success: true,
        data: users
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const schema = Joi.object({
        full_name: Joi.string().max(100),
        username: Joi.string().min(3).max(50),
        role: Joi.string().valid('admin', 'capturista', 'medico', 'display', 'admin_recurso', 'pan_recurso'),
        is_active: Joi.boolean()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar si el nuevo username ya existe (si se esta cambiando)
      if (value.username && value.username !== user.username) {
        const existingUser = await User.findByUsername(value.username);
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'El nombre de usuario ya existe'
          });
        }
      }

      const updatedUser = await User.update(req.params.id, value);

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: updatedUser
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // No permitir eliminar al propio usuario
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propio usuario'
        });
      }

      await User.delete(req.params.id);

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Determinar password segun rol
      const passwords = {
        admin: 'admin123#',
        capturista: 'captura123#',
        medico: 'medico123',
        display: 'display123',
        admin_recurso: 'recurso123#',
        pan_recurso: 'panrecurso123'
      };
      const newPassword = passwords[user.role] || 'password123';

      await User.update(req.params.id, { password: newPassword });

      res.json({
        success: true,
        message: `Contrasena restablecida a: ${newPassword}`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
