// ... existing code ...

  // Get analysis results endpoint
  app.get('/api/results', async (req, res) => {
    try {
      const { listAnalysisResults } = await import('../database');
      const { repository, limit, offset, status } = req.query;

      const results = await listAnalysisResults({
        repository: repository as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        status: status as string,
      });

      res.json({
        success: true,
        results,
        count: results.length,
      });
    } catch (error: any) {
      logger.error('Failed to fetch results', { error: error.message });
      const formattedError = formatError(error);
      res.status(formattedError.statusCode).json({
        error: formattedError.message,
        code: formattedError.code,
      });
    }
  });

  // Get analysis result by ID
  app.get('/api/results/:id', async (req, res) => {
    try {
      const { getAnalysisResultById } = await import('../database');
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid result ID' });
      }

      const result = await getAnalysisResultById(id);

      if (!result) {
        return res.status(404).json({ error: 'Analysis result not found' });
      }

      res.json({
        success: true,
        result,
      });
    } catch (error: any) {
      logger.error('Failed to fetch result', { error: error.message });
      const formattedError = formatError(error);
      res.status(formattedError.statusCode).json({
        error: formattedError.message,
        code: formattedError.code,
      });
    }
  });

  // Health check with database status
  app.get('/health', async (req, res) => {
    const config = loadConfig();
    const dbStatus = config.database.enabled ? await testConnection() : false;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: config.database.enabled ? (dbStatus ? 'connected' : 'disconnected') : 'disabled',
    });
  });

// ... existing code ...
