import { Router } from 'express';
import { loadAllConfigs, loadConfig, saveConfig, deleteConfig, configExists } from '../config-store.js';

export const sitesRouter = Router();

// GET /api/sites — List all configs
sitesRouter.get('/', (_req, res) => {
  const configs = loadAllConfigs();
  res.json(configs);
});

// GET /api/sites/:id — Get single config
sitesRouter.get('/:id', (req, res) => {
  const config = loadConfig(req.params.id);
  if (!config) return res.status(404).json({ error: 'Site not found' });
  res.json(config);
});

// POST /api/sites — Create new config
sitesRouter.post('/', (req, res) => {
  const config = req.body;
  if (!config.id || !config.name || !config.baseUrl) {
    return res.status(400).json({ error: 'id, name, and baseUrl are required' });
  }
  if (configExists(config.id)) {
    return res.status(409).json({ error: 'Site with this ID already exists' });
  }
  saveConfig(config);
  res.status(201).json(config);
});

// PUT /api/sites/:id — Update config
sitesRouter.put('/:id', (req, res) => {
  const existing = loadConfig(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Site not found' });
  const updated = { ...existing, ...req.body, id: req.params.id };
  saveConfig(updated);
  res.json(updated);
});

// DELETE /api/sites/:id — Delete config
sitesRouter.delete('/:id', (req, res) => {
  const deleted = deleteConfig(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Site not found' });
  res.json({ message: 'Deleted' });
});
