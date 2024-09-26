$(document).ready(function () {
	var basePath = window.location.pathname.replace("/xld-versions-plugin/index.html", "") + "/api/extension/xld-versions-plugin";
	var minimumCharacters = 3;
	var maxResults = 100;
	var defaultDisplayTimeout = 8; // in seconds

	var selectedApplication = null;
	function getAuthHeader() {
		var flexApp = parent.document.getElementById("flexApplication");
		return flexApp ? flexApp.getBasicAuth() : null;
	}

	function ajaxGet(url, params) {
		return $.ajax({
			url: url,
			method: 'GET',
			headers: {
				'Authorization': getAuthHeader()
			},
			data: params
		});
	}

	function getDefaultApp() {
		return ajaxGet(basePath + '/default-app').then(function (response) {
			return response.entity;
		}).catch(function (error) {
			// Handle the error
			showError("An error occured while loading the default application");
			return null;
		});
	}

	function getSettings() {
		return ajaxGet(basePath + '/plugin-settings').then(function (response) {
			console.log("Plugin settings : ", response.entity);
			minimumCharacters = 3;
			if (response.entity.minimumCharactersToSearch) {
				minimumCharacters = response.entity.minimumCharactersToSearch;

				var txt = "Type to search an application";
				if (minimumCharacters === 1) {
					txt = "Type at least 1 character to search";
				}
				else {
					txt = "Type at least " + minimumCharacters + " characters to search";
				}
				$("#search").prop("placeholder", txt);

			}
			if (response.entity.maxResults) {
				maxResults = response.entity.maxResults;
				console.log("Set max results to " + maxResults);
				$("#maxResults").text(maxResults);
				if (maxResults < 0) {
					$("#maxResultsDescription").hide();
				}
			}
			if (minimumCharacters == 0) {
				refreshApps();

			}

			$('#search').prop('disabled', false);
			$('#searchButton').prop('disabled', false);
			$('#loader').hide();
			return response.entity;
		});
	}
	function getEnvOrder() {
		return ajaxGet(basePath + '/env-order').then(function (response) {
			return response.entity;
		}).catch(function (error) {
			// Handle the error
			showError("An error occured while loading the environment order");
			return null;
		});
	}

	function getApplications(query) {
		console.log("Load applications");
		hideError();
		// Double check for query length
		if (query && query.length >= minimumCharacters) {
			return ajaxGet(basePath + '/applications', { q: query, n: maxResults }).then(function (response) {
				var apps = response.entity;
				apps.sort();

				// Populate applications dropdown
				$('#application').html("");
				$('<option>').val("").text("Please select an application").appendTo('#application');
				$.each(apps, function (index, app) {
					$('<option>').val(app).text(app).appendTo('#application');
				});
				$('#application').prop('disabled', false);
				$('#loader').hide();
				return apps;
			}).catch(function (error) {
				$('#loader').hide();
				// Handle the error
				showError("An error occured while loading the applications");
				$('#application').prop('disabled', 'disabled');
				return null;
			});
		}
	}

	function getVersions(app) {
		if (app) {
			return ajaxGet(basePath + '/versions', { "application": app }).then(function (response) {
				return response;
			}).catch(function (error) {
				// Handle the error
				showError("An error occured while loading the versions for application : " + app);
				return null;
			});
		} else {
			return Promise.resolve(null);
		}
	}

	function getEnvDetails(env, app) {
		return ajaxGet(basePath + '/env-details', { "env": env, "application": app }).then(function (response) {
			return response.entity;
		}).catch(function (error) {
			// Handle the error
			showError("An error occured while loading the environment details");
			return null;
		});
	}

	function getVersionDetails(version) {
		return ajaxGet(basePath + '/version-details', { 'version': version }).then(function (response) {
			return response.entity;
		}).catch(function (error) {
			// Handle the error
			showError("An error occured while loading the version details");
			return null;
		});
	}

	function compareEnvironments(a, b, envOrder) {
		for (var i = 0; i < envOrder.length; i++) {
			var regex = new RegExp(envOrder[i], 'g');
			a = a.replace(regex, ("00000" + i).slice(-5));
			b = b.replace(regex, ("00000" + i).slice(-5));
		}
		return a.localeCompare(b);
	}

	function getEnvironments(versions, envOrder) {
		var environments = [];
		for (var v in versions) {
			var envs = versions[v]["envs"];
			environments.push.apply(environments, envs);
		}
		return environments.sort(function (a, b) {
			return compareEnvironments(a, b, envOrder);
		});
	}

	function countKeys(obj) {
		return obj ? Object.keys(obj).length : 0;
	}

	function showEnvDetails(env) {
		console.log("Selected application : ", selectedApplication);
		getEnvDetails(env, selectedApplication).then(function (envDetails) {
			// Open modal with envDetails
			openEnvDetailsModal(envDetails);
		});
	}

	function compareVersion(env, compareVersionId) {
		var envVersion, compareVersion;
		getVersionDetails(compareVersionId)
			.then(function (compareVersionsDetails) {
				compareVersion = compareVersionsDetails;
				return getEnvDetails(env, selectedApplication);
			})
			.then(function (envDetails) {
				return getVersionDetails(envDetails.version);
			})
			.then(function (envVersionsDetails) {
				envVersion = envVersionsDetails;
				for (var package in compareVersion.packages) {
					if (!envVersion.packages[package]) {
						envVersion.packages[package] = "-";
					}
				}
				for (var package in envVersion.packages) {
					if (!compareVersion.packages[package]) {
						compareVersion.packages[package] = "-";
					}
				}
				// Open modal with env, envVersion, compareVersion
				openCompareModal(compareVersion);
			});
	}

	function refreshApps() {
		closeAllModals();
		hideError();
		var query = $("#search").val();
		if (query.length >= minimumCharacters) {
			getApplications(query);
		}
		else {
			$('#application').prop('disabled', 'disabled');
		}
	}

	function loadVersionsForSelectedApplication() {

		closeAllModals();
		hideError();
		$('#versionsTable').hide();
		if (selectedApplication && selectedApplication != "") {

			var message = "Loading versions for <strong>" + selectedApplication + "</strong> ...";
			$("#loaderMessage").html(message);
			$("#loader").show();
			$('#applicationName').text(selectedApplication);
		}
		getEnvOrder()
			.then(function (envOrder) {

				return getVersions(selectedApplication).then(function (data) {

					if (data == null) {
						// there is an error
						return;
					}
					var versions = data.entity;
					var environments = getEnvironments(versions, envOrder);
					$('#loader').hide();
					$('#versionsTable').hide();

					if (Object.keys(data.entity).length === 0) {
						$('#noVersionsMessage').show();
					} else {
						$('#versionsTable').show();
						$('#versionsBody').empty();
						$('#versionsTable thead tr').empty().append('<th></th>');
						$.each(environments, function (index, env) {
							$('#versionsTable thead tr').append('<th>' + env.split('/').pop() + '</th>');
						});
						$.each(versions, function (version, details) {
							var row = $('<tr></tr>');
							var versionCell = $('<td class="version"></td>');
							if (details.package.type !== 'udm.CompositePackage') {
								versionCell.text(version.split('/').pop());
							} else {
								var link = $('<a></a>').text(version.split('/').pop()).click(function () {
									details.isCollapsed = !details.isCollapsed;
									$(this).find('span').html('<i class="bi bi-caret-down-square-fill"></i>');
									$(this).next('table').toggle();
								});
								link.prepend('<span class="folder-item"><i class="bi bi-caret-up-square-fill"></i></span> ');
								versionCell.append(link);

								var detailsTable = $('<table class="details" style="display: none;"></table>');
								$.each(details.package.packages, function (index, pkg) {
									detailsTable.append('<tr><td class="details">' + pkg.id.replace("Applications/", "").split('/').slice(-2)[0] + '</td><td class="details">' + pkg.id.replace("Applications/", "").split('/').pop() + '</td></tr>');
								});
								versionCell.append(detailsTable);
							}
							row.append(versionCell);

							$.each(environments, function (index, env) {
								var envCell = $('<td />');
								if (details.envs.indexOf(env) >= 0) {
									var link = $('<a>', {
										class: 'show-link',
										title: 'Show containers for ' + env,
										'data-env': env,
										html: '<i class="bi bi-check-lg"></i>'
									});
									link.on('click', function () {
										var env = $(this).data('env');
										showEnvDetails(env);
									});
									envCell.append(link);
								} else if (details.package.type === 'udm.CompositePackage') {
									var compareLink = $('<a>', {
										class: 'compare',
										title: 'Compare ' + env + ' with version ' + version,
										'data-env': env,
										'data-version': version,
										html: '<img src="../assets/compare.png" alt="Compare" title="Compare"/>'
									});
									compareLink.on('click', function () {
										var env = $(this).data('env');
										var version = $(this).data('env');
										compareVersion(env, version);
									});

									envCell.append(compareLink);
								}
								row.append(envCell);
							});

							$('#versionsBody').append(row);
						});
					}
				});
			})
			.fail(function (error) {
				showError(error);
			});
	}


	function showError(text) {

		$('#errorMessage').text(text);
		$('#errorMessageBox').show();
		setTimeout(function () {
			$('#errorMessageBox').fadeOut();
		}, defaultDisplayTimeout * 1000);
	}
	function hideError() {

		$('#errorMessageBox').hide();
	}

	// ENV MODALS

	// Function to open the modal
	function openEnvDetailsModal(envDetails) {
		$('#envDetailsModal .modal-title').text(envDetails.env);
		$('#envVersion').text(envDetails.version);
		$('#containerList').empty();
		$.each(envDetails.containers, function (index, container) {
			$('#containerList').append('<li>' + container + '</li>');
		});
		$('#envDetailsModal').modal('show');

	}

	function closeAllModals() {

		$('#envDetailsModal').modal('hide');
		$('#compareModal').modal('hide');
		$('#noVersionsMessage').hide();
	}

	// Function to close the modal
	$('#closeEnvDetailsModal').click(function () {
		closeAllModals();
	});

	// COMPARE MODALS

	// Function to open the modal
	function openCompareModal(compareData) {
		$('#applicationName').text(compareData.application);
		$('#envVersionId').text(compareData.envVersion.id.split('/').pop());
		$('#envName').text(compareData.env.split('/').pop());
		$('#compareVersionId').text(compareData.compareVersion.id.split('/').pop());
		$('#envVersionIdHeader').text(compareData.envVersion.id.split('/').pop());
		$('#compareVersionIdHeader').text(compareData.compareVersion.id.split('/').pop());

		$('#packageComparison').empty();
		$.each(compareData.envVersion.packages, function (package, version) {
			var compareVersion = compareData.compareVersion.packages[package] || '';
			var diffClass = (version !== compareVersion) ? 'diff' : '';
			$('#packageComparison').append(
				'<tr>' +
				'<td>' + package.replace('Applications/', '') + '</td>' +
				'<td>' + version + '</td>' +
				'<td class="' + diffClass + '">' + compareVersion + '</td>' +
				'</tr>'
			);
		});

		$('#compareModal').modal('show');
	}


	// Function to close the modal
	$('#closeCompareModal').click(function () {
		closeAllModals();
	});


	// On startup
	getSettings()
	$('#application').change(function () {

		selectedApplication = $(this).val();
		loadVersionsForSelectedApplication();

	});

	$("#searchForm").on("submit", function (event) {
		event.preventDefault();

		$('#versionsTable').hide();
		$("#loaderMessage").html("Loading applications...");
		$('#loader').show();

		hideError();
		var query = $("#search").val();
		if (query.length >= minimumCharacters) {
			getApplications(query);
		}
		else {
			showError("You must set at least " + minimumCharacters + " characters");
			$('#application').prop('disabled', 'disabled');
			$('#loader').hide();

		}
	})

	getDefaultApp().then(function (defaultApp) {
		if (defaultApp != null && defaultApp != "") {
			selectedApplication = defaultApp;
			$('#application').prop('disabled', false);
			loadVersionsForSelectedApplication();
		}
	});

	// Event handlers
	$('#refresh').click(refreshApps);
});
