
settings = repositoryService.query(Type.valueOf("versions.SearchFilters"), None, "Configuration", None, None, None, 0, -1)
minimumCharactersToSearch = 0
maxResults = 100

if settings and len(settings) > 0:
	result = settings[0]
	if len(settings) > 1:
		logger.warn("More than one SearchFilters found, using the first: %s" % (settings[0].id))

	plugin_settings = repositoryService.read(result.id)
	minimumCharactersToSearch = plugin_settings.minimumCharactersToSearch
	maxResults = plugin_settings.maxResults

response.entity = { "minimumCharactersToSearch" : minimumCharactersToSearch, "maxResults" : maxResults }
