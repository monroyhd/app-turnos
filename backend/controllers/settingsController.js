const Settings = require('../models/settings');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');

const settingsSchema = Joi.object({
  hospital_name: Joi.string().max(255).required()
});

const settingsController = {
  async get(req, res, next) {
    try {
      const settings = await Settings.getSettings();

      res.json({
        success: true,
        data: settings
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const currentSettings = await Settings.getSettings();
      const updateData = {};

      // Validate and set hospital_name
      if (req.body.hospital_name) {
        const { error } = settingsSchema.validate({ hospital_name: req.body.hospital_name });
        if (error) {
          return res.status(400).json({
            success: false,
            message: error.details[0].message
          });
        }
        updateData.hospital_name = req.body.hospital_name;
      }

      // Handle logo upload
      if (req.files && req.files.logo && req.files.logo[0]) {
        const logoFile = req.files.logo[0];
        const logoPath = `/uploads/${logoFile.filename}`;

        // Delete old logo if exists
        if (currentSettings.logo_path) {
          const oldLogoPath = path.join(__dirname, '../public', currentSettings.logo_path);
          if (fs.existsSync(oldLogoPath)) {
            fs.unlinkSync(oldLogoPath);
          }
        }

        updateData.logo_path = logoPath;
      }

      // Handle background upload
      if (req.files && req.files.background && req.files.background[0]) {
        const bgFile = req.files.background[0];
        const bgPath = `/uploads/${bgFile.filename}`;

        // Delete old background if exists
        if (currentSettings.background_path) {
          const oldBgPath = path.join(__dirname, '../public', currentSettings.background_path);
          if (fs.existsSync(oldBgPath)) {
            fs.unlinkSync(oldBgPath);
          }
        }

        updateData.background_path = bgPath;
      }

      // Handle logo removal
      if (req.body.remove_logo === 'true' || req.body.remove_logo === true) {
        if (currentSettings.logo_path) {
          const oldLogoPath = path.join(__dirname, '../public', currentSettings.logo_path);
          if (fs.existsSync(oldLogoPath)) {
            fs.unlinkSync(oldLogoPath);
          }
        }
        updateData.logo_path = null;
      }

      // Handle background removal
      if (req.body.remove_background === 'true' || req.body.remove_background === true) {
        if (currentSettings.background_path) {
          const oldBgPath = path.join(__dirname, '../public', currentSettings.background_path);
          if (fs.existsSync(oldBgPath)) {
            fs.unlinkSync(oldBgPath);
          }
        }
        updateData.background_path = null;
      }

      const settings = await Settings.updateSettings(updateData);

      res.json({
        success: true,
        message: 'Configuracion actualizada exitosamente',
        data: settings
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = settingsController;
