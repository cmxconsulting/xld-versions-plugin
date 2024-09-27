XLD Versions Plugin
===================
This is a complete UI rewrite from the https://github.com/xebialabs-community/xld-versions-plugin repository.

## Description

This is a Digital.ai Deploy (XL-Deploy) plugin for showing an overview which (versions of) applications are deployed to which environments.

## Features

 * Get an overview which versions of an application are deployed to which environments
 * Get the details (list of sub-packages) of a composite package
 * Show to which containers the application is deployed
 * Compare a deployed composite package to another, showing the changes in sub-packages


## Configuration
The plugin adds two configuration types, which can be added to the `Configurations/` part of the repository:

 * `versions.DefaultApplication` - Sets the default application to show in the overview.
 * `versions.EnvironmentOrder` - Overrides the default (lexicographically) ordering of environments. Uses a list of regexes to match environment names, and replaces the matches with an incremental number to change the sorting.
 * `versions.SearchFilters` - Sets how many characters need to be written before retrieving the applications. This is useful when you have thousands applications in Deploy.

Note: These types should only be added to the repository once. If there are more, it will just pick the first that it finds.

## Versions
This plugin is compliant with Digital.ai Deploy 24.1.8 version.