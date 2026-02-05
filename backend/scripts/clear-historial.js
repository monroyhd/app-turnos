#!/usr/bin/env node
/**
 * Script para borrar el historial de recursos
 * Uso: node scripts/clear-historial.js
 */

const knex = require('knex');
const config = require('../config/database');

const db = knex(config[process.env.NODE_ENV || 'development']);

async function clearHistorial() {
  try {
    const count = await db('historial_recursos').count('* as total').first();
    console.log(`Registros actuales en historial: ${count.total}`);

    if (count.total === 0) {
      console.log('El historial ya está vacío.');
      process.exit(0);
    }

    // Confirmar antes de borrar
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`¿Estás seguro de borrar ${count.total} registros? (s/N): `, async (answer) => {
      if (answer.toLowerCase() === 's') {
        await db('historial_recursos').del();
        console.log('Historial borrado exitosamente.');
      } else {
        console.log('Operación cancelada.');
      }
      rl.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

clearHistorial();
