const Doctor = require('../models/doctor');
const User = require('../models/user');
const Joi = require('joi');

// Funcion para generar username: primera letra + punto + apellido
// Ejemplo: "Juan Perez Garcia" -> "j.perez"
function generateUsername(fullName) {
  const normalized = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z\s]/g, '') // Solo letras y espacios
    .trim();

  const parts = normalized.split(/\s+/).filter(p => p.length > 0);

  if (parts.length === 0) return 'usuario';
  if (parts.length === 1) return parts[0];

  // Primera letra del primer nombre + punto + primer apellido
  const firstLetter = parts[0].charAt(0);
  const lastName = parts.length >= 2 ? parts[1] : parts[0];

  return `${firstLetter}.${lastName}`;
}

// Genera un username unico verificando en la base de datos
async function generateUniqueUsername(fullName) {
  const baseUsername = generateUsername(fullName);
  let username = baseUsername;
  let counter = 1;

  while (await User.findByUsername(username)) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  return username;
}

const doctorCreateSchema = Joi.object({
  user_id: Joi.number().integer(),
  full_name: Joi.string().max(100).required(),
  specialty: Joi.string().max(100).required(),
  email: Joi.string().email().max(100).required(),
  phone: Joi.string().max(20).allow('', null),
  is_active: Joi.boolean(),
  service_ids: Joi.array().items(Joi.number().integer())
});

const doctorUpdateSchema = Joi.object({
  full_name: Joi.string().max(100),
  specialty: Joi.string().max(100).allow('', null),
  email: Joi.string().email().max(100).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  is_active: Joi.boolean(),
  service_ids: Joi.array().items(Joi.number().integer()),
  username: Joi.string().max(50).allow('', null)
});

const doctorController = {
  async list(req, res, next) {
    try {
      const filters = {
        is_active: req.query.is_active === 'true' ? true :
                   req.query.is_active === 'false' ? false : undefined,
        specialty: req.query.specialty,
        service_id: req.query.service_id ? parseInt(req.query.service_id) : undefined
      };

      const doctors = await Doctor.findAll(filters);

      res.json({
        success: true,
        data: doctors
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const doctor = await Doctor.findById(req.params.id);

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Medico no encontrado'
        });
      }

      res.json({
        success: true,
        data: doctor
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = doctorCreateSchema.validate(req.body, { stripUnknown: true });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      // Generar credenciales de usuario
      const username = await generateUniqueUsername(value.full_name);
      const email = value.email;
      const password = 'medico123';

      // Verificar que el email no exista
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: `Ya existe un usuario con el email: ${email}`
        });
      }

      // Crear el usuario primero
      const user = await User.create({
        username,
        email,
        password,
        full_name: value.full_name,
        role: 'medico'
      });

      // Crear el doctor vinculado al usuario
      value.user_id = user.id;
      const doctor = await Doctor.create(value);

      res.status(201).json({
        success: true,
        message: 'Medico registrado exitosamente',
        data: doctor,
        credentials: {
          username,
          password,
          email
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { error, value } = doctorUpdateSchema.validate(req.body, { stripUnknown: true });
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const existing = await Doctor.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Medico no encontrado'
        });
      }

      // Si se quiere cambiar el username, verificar que no exista
      if (value.username && existing.user_id) {
        const normalizedUsername = value.username.toLowerCase().trim();
        const existingUser = await User.findByUsername(normalizedUsername);
        if (existingUser && existingUser.id !== existing.user_id) {
          return res.status(409).json({
            success: false,
            message: `Ya existe un usuario con el nombre de usuario: ${normalizedUsername}`
          });
        }
        // Actualizar username en la tabla users
        await User.update(existing.user_id, { username: normalizedUsername });
      }

      // Remover username del value antes de actualizar doctor
      delete value.username;

      const doctor = await Doctor.update(req.params.id, value);

      res.json({
        success: true,
        message: 'Medico actualizado exitosamente',
        data: doctor
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const existing = await Doctor.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Medico no encontrado'
        });
      }

      // Desactivar el doctor
      await Doctor.delete(req.params.id);

      // Desactivar el usuario asociado si existe
      if (existing.user_id) {
        await User.update(existing.user_id, { is_active: false });
      }

      res.json({
        success: true,
        message: 'Medico desactivado exitosamente'
      });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const doctor = await Doctor.findById(req.params.id);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Medico no encontrado'
        });
      }

      if (!doctor.user_id) {
        return res.status(400).json({
          success: false,
          message: 'El medico no tiene usuario asociado'
        });
      }

      // Reset password to generic 'medico123'
      await User.update(doctor.user_id, { password: 'medico123' });

      res.json({
        success: true,
        message: 'Contrasena restablecida a: medico123'
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = doctorController;
