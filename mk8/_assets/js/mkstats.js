(function($, document, window, undefined) {

	"use strict";

	$.MK = function(apiOptions) {

		var MK = {
			api: null,
			nav: null,
			model: null
		};

		var model = {

			single: {

				tournament: null,

				user: null,

				userId: null

			},

			collection: {

				raceResults: [],

				tournaments: [],

				tournamentPlayers: [],

				userRoles: []

			},

			flag: {
				
				enableRaceResultsSelection: false,

				loggedIn: function() {
					return model.single.userId != null && model.single.userId != 'public';
				}

			},

		};

		var pageIn = {

			'index':
			function(page, showPage) {
				ensureLogin(function() {
					fetchTournaments()
						.done(function() {
							showPage();
						});
				});
			},

			'tournament':
			function(page, showPage) {
				ensureLogin(function() {
					var id = MK.nav.getHashVar('id', null);
					if (id !== null) {
						fetchTournament(id)
							.done(function() {
								$('.error', '.tournament-page').hide();
								showPage();
							});
					} else {
						$('.error', '.tournament-page').show()
						showPage();
					}
				});
			}

		};

		var pageOut = {};

		var customRestUrl = function(suffix) {
			return apiOptions.url.replace(/\/$/,'') + '/index.php/pub/' + suffix;
		};

		var showDangerBootbox = function(myText, myCallback) {
			showBootbox('danger', myText, myCallback);
		};

		var showInfoBootbox = function(myText, myCallback) {
			showBootbox('info', myText, myCallback);
		};

		var showBootbox = function(myLevel, myText, myCallback) {
			bootbox.dialog({
				message: myText,
				buttons: {
					success: {
						label: "OK",
						className: "btn-" + myLevel,
						callback: function() {
							if (typeof(myCallback) == "function") {
								myCallback();
							}
						}
					}
				}
			});
		};

		var showConfirmBootbox = function(myLevel, myText, myConfirmCallback, myCancelCallback) {
			bootbox.dialog({
				message: myText,
				buttons: {
					failure: {
						label: "Cancel",
						className: "btn-default",
						callback: function() {
							if (typeof(myCancelCallback) == "function") {
								myCancelCallback();
							}
						}
					},
					success: {
						label: "OK",
						className: "btn-" + myLevel,
						callback: function() {
							if (typeof(myConfirmCallback) == "function") {
								myConfirmCallback();
							}
						}
					}
				}
			});
		};

		/**
		 * given the results of an ajax fail, parse what we have available and
		 * come up with a suitable error message to return
		 *
		 * - try to parse the result as JSON.
		 * - if that succeeds, then we see if there is a field-specific error
		 *   set. if there is, do some formatting on the field name, it is
		 *   likely underscored (eg first_name).
		 * - if there's not a field-specific error, use the general error in
		 *   the json if there is one, otherwise use the errorThrown.
		 * - if the responseText isn't valid JSON, assume it's text. If it's not
		 *   empty, use that as the error, otherwise use the errorThrown.
		 */
		var getFailureError = function(jqXHR, textStatus, errorThrown, mapping) {
			var json,
				text,
				fieldName;
			try {
				json = $.parseJSON(jqXHR.responseText);
				if (json != null && json.field != null && json.field != '') {
					// field-specific error, use it with some formatting
					if (mapping != undefined && mapping.hasOwnProperty(json.field)) {
						fieldName = mapping[json.field];
					} else {
						fieldName = json.field.toLowerCase().replace(/_/g, ' ');
					}
					text = "<span class='capitalize'>" + fieldName + "</span> is required, please try again.";
				} else if (json != null) {
					if (json.error != '' && json.error.indexOf("ERROR:  duplicate key value") === 0) {
						text = "You've already submitted a duplicate request. We were unable to accept this submission.";
					} else if (json.error != '') {
						text = json.error;
					} else if (json.status != '') {
						text = json.status;
					}
				} else {
					text = errorThrown;
				}
			} catch (exception) {
				if (jqXHR.responseText != null && jqXHR.responseText != '') {
					text = jqXHR.responseText;
				} else {
					text = errorThrown;
				}
			}
			return "<i class='fa fa-exclamation-triangle'></i> " + text;
		};

		var ensureLogin = function(callback) {
			return ping(callback)
				.done(function() {
					$('body').toggleClass('logged-in', model.flag.loggedIn())
				});
		};

		var autoFocusFirstFormField = function(containerElement) {
			$('input, textarea, select', containerElement)
					.not(':input[type=button], :input[type=submit], :input[type=reset]').first().focus().select();
		};

		// encode anything we need to inject into build html
		var htmlEncode = function(input) {
			return String(input)
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
		};

		var integerToRank = function(i) {
			var suffix = '',
				j = i;
			try {
				// mod 100
				j = j % 100;
				switch (i) {
					case 11:
					case 12:
					case 13:
						suffix = 'th';
						break;
					default:
						// now mod 10
						j = j % 10;
						switch (j) {
							case 1:
								suffix = 'st';
								break;
							case 2:
								suffix = 'nd';
								break;
							case 3:
								suffix = 'rd';
								break;
							default:
								suffix = 'th';
						}
				}
				return i + '<sup>' + suffix + '</sup>';
			} catch (err) {
				return "--";
			}
		};

		/***********************************************************************
		 * API CALLS
		 **********************************************************************/

		var ping = function(callback) {
			return MK.api.ping()
				.fail(function(jqXHR, textStatus, errorThrown) {
					return publicLogin(callback);
				}).done(function(response, textStatus, jqXHR) {
					model.single.userId = response.key.username;
					if (typeof(callback) == "function") {
						callback();
					}
				});
		};

		/**
		 * login as public user to get api token
		 */
		var publicLogin = function(callback) {
			return userLogin('public', 'public', callback);
		};

		/**
		 * login as user (including public)
		 */
		var userLogin = function(username, password, callback) {
			return MK.api.login(username, password)
				.fail(function(jqXHR, textStatus, errorThrown) {
					$('#loginModal .error').html(getFailureError(jqXHR, textStatus, errorThrown));
				}).done(function(response, textStatus, jqXHR) {
					$('#loginModal .error').empty();
					model.single.userId = response.key.username;
					$('body').toggleClass('logged-in', model.flag.loggedIn())
					if (typeof(callback) == "function") {
						callback();
					}
				});
		};

		var userLogout = function() {
			MK.api.logout().always(function() {
				model.single.user = null;
				model.single.userId = null;
				model.collection.userRoles = [];
				model.collection.raceResults = [];
				model.flag.enableRaceResultsSelection = false;
				publicLogin(function() {
					MK.nav.goTo('index');
				});
			});
		};

		var fetchTournament = function(id) {
			var df = $.Deferred(),
				requests = [];
			requests.push(fetchTournamentInfo(id));
			requests.push(fetchTournamentPlayers(id));
			$.when.apply($, requests).done(function() {
				df.resolve();
			}).fail(function() {
				df.reject();
			});
			return df.promise();
		};

		var fetchTournamentInfo = function(tournamentId) {
			return MK.api.view('tournament', tournamentId)
				.done(function(response, textStatus, jqXHR) {
					model.single.tournament = response;
					$('.tournament-page .name').html(htmlEncode(model.single.tournament.name));
					$('.tournament-page .race-count').html(htmlEncode(model.single.tournament.race_count));
					$('.tournament-page .player-count').html(htmlEncode(model.single.tournament.player_count));
				});
		};

		var fetchTournamentPlayers = function(tournamentId) {
			model.collection.tournamentPlayers = [];
			return getDeferredFetchAllDetails(model.collection.tournamentPlayers, 'tournament', tournamentId, 'tournament_player')
				.done(function() {
					$('.tournament-page .player-list').empty();
					var showRank = (model.single.tournament.race_count > 0);
					if (model.collection.tournamentPlayers.length > 0) {
						$.each(model.collection.tournamentPlayers, function(i, player) {
							$('.tournament-page .player-list').append(
								'<tr class="player rank-' + (showRank?(i+1):'n-a') + ' not-in-race-results"' +
								'   data-id="' + player.id + '"' +
								'   data-1-count="' + player.first + '"' +
								'   data-2-count="' + player.second + '"' +
								'   data-3-count="' + player.third + '"' +
								'   data-4-count="' + player.fourth + '"' +
								'   data-5-count="' + player.fifth + '"' +
								'   data-6-count="' + player.sixth + '"' +
								'   data-7-count="' + player.seventh + '"' +
								'   data-8-count="' + player.eighth + '"' +
								'   data-9-count="' + player.ninth + '"' +
								'   data-10-count="' + player.tenth + '"' +
								'   data-11-count="' + player.eleventh + '"' +
								'   data-12-count="' + player.twelfth + '"' +
								'>' +
								'  <td>' + (showRank?integerToRank(i+1):'-') + '</td>' +
								'  <td><img src="https://apps.getpario.com' + player['player.mii'] + '"' +
								'           alt="' + player['player.name'] + '" class="img-responsive mii">' +
								'  </td>' + 
								'  <td>' + htmlEncode(player.points) + '</td>' +
								'  <td>' + htmlEncode(player.winning_percentage) + '</td>' +
								'  <td class="race-rank"></td>' +
								'</tr>'
							);
						});
					} else {
						$('.tournament-page .player-list').append(
							'<tr><td colspan="3">No players are listed in this tournament</td></tr>'
						);
					}
				});
		};

		var fetchTournaments = function() {
			model.collection.tournaments = [];
			return getDeferredFetchAll(model.collection.tournaments, 'tournament')
				.done(function() {
					$('.index-page .tournaments').empty();
					if (model.collection.tournaments.length > 0) {
						$.each(model.collection.tournaments, function(i, tournament) {
							var tr = $('<tr data-id="' + tournament.id + '">');
							tr.append(
								'<td>' + htmlEncode(tournament.player_list) + '</td>' +
								'<td>' + htmlEncode(tournament.race_count) + '</td>' +
								'<td>' + htmlEncode(tournament.leader) + '</td>'
							);
							$('.index-page .tournaments').append(tr);
						});
					} else {
						$('.index-page .tournaments').append('<tr><td colspan="3">No tournaments available</td></tr>');
					}
				}).fail(function(jqXHR, textStatus, errorThrown) {
					$('#loginModal .error').html(getFailureError(jqXHR, textStatus, errorThrown));
					showDangerBootbox("Unable to retrieve tournaments. Click 'OK' to reload.", function() {
						window.location.reload();
					});
				});
		};

		/**
		 * retrieve user record
		 */
		var fetchUser = function() {
			return MK.api.view('user', model.single.userId)
				.fail(function(jqXHR, textStatus, errorThrown) {
					showDangerBootbox("Unable to retrieve user record. Click 'OK' to reload.", function() {
						window.location.reload();
					});
				}).done(function(response, textStatus, jqXHR) {
					model.single.user = response;
				});
		};

		/**
		 * pull all user_role records for the given user and push them into the
		 * userRoles KO collection
		 */
		var fetchUserRoles = function(callback) {
			model.collection.userRoles = [];
			return getDeferredFetchAllDetails(model.collection.userRoles, 'user', model.single.userId, 'customer_role')
				.fail(function(jqXHR, textStatus, errorThrown) {
					showDangerBootbox("Unable to retrieve user roles. Click 'OK' to reload.", function() {
						window.location.reload();
					});
				});
		};

		/**
		 * FETCH ALL RECORDS FUNCTIONS
		 */

		/**
		 * Given a target data array (dataContainer), make all the necessary API
		 * calls to fetch every qualifying record from the specified table that
		 * meets the provided filter (optional, provide null if necessary to
		 * give arg after) and settings.
		 *
		 * For each row of data that comes back in any of the fetches, we can
		 * also run an optional callback (recordCallback) that will be passed the
		 * row of data in question.
		 *
		 * return $.Deferred().promise()
		 */
		var getDeferredFetchAll = function(dataContainer, table, filter, settings, recordCallback) {
			var df = $.Deferred(),
				requests = [],
				request;
			request = getDeferredFetchWithOffset(
				dataContainer, table, filter, 0, settings, recordCallback
			);
			// process our first response and kick off any others that might be needed
			request.done(function(response, textStatus, jqXHR) {
				var n_pages = response.n_pages,
					offset = 1,
					n_request;
				/**
				 * save our original request... if it needs to get involved in
				 * the $.when call, otherwise this will go unused
				 */
				requests.push(request);
				if (n_pages > 1) {
					// kick off all other requests needed to fetch everything
					while (offset < n_pages) {
						n_request = getDeferredFetchWithOffset(
							dataContainer, table, filter, offset, settings, recordCallback
						);
						requests.push(n_request);
						offset++;
					}
					// wait on the remaining requests before marking as done
					$.when.apply($, requests).done(function() {
						df.resolve();
					}).fail(function() {
						df.reject();
					});
				} else {
					// only 1 page and we just got it
					df.resolve();
				}
			}).fail(function() {
				df.reject();
			});
			// return the promise of the deferred so the caller can't modify the deferred
			return df.promise();
		};

		/**
		 * Returns the $.ajax promise for the offset fetch operation requested
		 *
		 * if a filter is non-null, use the API's filter method, otherwise use browse
		 */
		var getDeferredFetchWithOffset = function(dataContainer, table, filter, offset, settings, recordCallback) {
			var deferred;
			if (filter == null) {
				deferred = MK.api.browse(table, offset, settings);
			} else {
				deferred = MK.api.filter(table, filter, offset, settings);
			}
			return deferred.fail(function(jqXHR, textStatus, errorThrown) {
				showInfoBootbox("We were unable to load your " + table + " data. Please try visiting us later");
			}).done(function(response, textStatus, jqXHR) {
				if (response.rows.length > 0) {
					$.each(response.rows, function(i, row) {
						dataContainer.push(row.data);
						if (typeof(recordCallback) == "function") {
							recordCallback(row.data);
						}
					});
				}
			});
		};

		/**
		 * FETCH ALL DETAIL RECORDS FUNCTIONS
		 */

		/**
		 * Given a target data array (dataContainer), make all the necessary API
		 * calls to fetch every qualifying record from the specified detail
		 * table that has a reference to the master table's specified record.
		 *
		 * For each row of data that comes back in any of the fetches, we can
		 * also run an optional callback (recordCallback) that will be passed the
		 * row of data in question.
		 *
		 * return $.Deferred().promise()
		 */
		var getDeferredFetchAllDetails = function(dataContainer, table, pkey, detailTable, settings, recordCallback) {
			var df = $.Deferred(),
				requests = [],
				request;
			request = getDeferredFetchDetailsWithOffset(
				dataContainer, table, pkey, detailTable, 0, settings, recordCallback
			);
			// process our first response and kick off any others that might be needed
			request.done(function(response, textStatus, jqXHR) {
				var n_pages = response.n_pages,
					offset = 1,
					n_request;
				/**
				 * save our original request... if it needs to get involved in
				 * the $.when call, otherwise this will go unused
				 */
				requests.push(request);
				if (n_pages > 1) {
					// kick off all other requests needed to fetch everything
					while (offset < n_pages) {
						n_request = getDeferredFetchDetailsWithOffset(
							dataContainer, table, pkey, detailTable, offset, settings, recordCallback
						);
						requests.push(n_request);
						offset++;
					}
					// wait on the remaining requests before marking as done
					$.when.apply($, requests).done(function() {
						df.resolve();
					}).fail(function() {
						df.reject();
					});
				} else {
					// only 1 page and we just got it
					df.resolve();
				}
			}).fail(function() {
				df.reject();
			});
			// return the promise of the deferred so the caller can't modify the deferred
			return df.promise();
		};

		/**
		 * Returns the $.ajax promise for the offset fetch operation requested
		 */
		var getDeferredFetchDetailsWithOffset = function(dataContainer, table, pkey, detailTable, offset, settings, recordCallback) {
			return MK.api.browseDetail(table, pkey, detailTable, offset, settings)
				.done(function(response, textStatus, jqXHR) {
					if (response.rows.length > 0) {
						$.each(response.rows, function(i, row) {
							dataContainer.push(row.data);
							if (typeof(recordCallback) == "function") {
								recordCallback(row.data);
							}
						});
					}
				});
		};

		MK.api = $.ParioAPI(apiOptions);
		MK.nav = $.Navigation({
			defaultPage: 'index',
			forceDefault: false,
			pageIns: pageIn,
			pageOuts: pageOut,
			wrapper: $('#main'),
			activateLinks: null,
			deactivateLinks: null
		});
		MK.model = model;

		// hook up our loading indicator... use jQuery built in since it's more resilient
		$(document).ajaxStart(function() {
			$('#loading-spinner').show();
		});
		$(document).ajaxStop(function() {
			$('#loading-spinner').hide();
		});

		// collapse menu for mobile when link is clicked
		$('.navbar-collapse a').click(function (e) {
			$('.navbar-toggle').click();
		});

		// focus modal's first form field
		$('.modal').on('shown.bs.modal', function(e) {
			autoFocusFirstFormField(this);
		});

		$('.modal').on('hide.bs.modal', function(e) {
			$('input', this).val('');
		});

		// login in user from modal
		$('#loginForm').off('submit').on('submit.mkstats', function(e) {
			e.preventDefault();
			userLogin($('#loginFormUsername').val(), $('#loginFormPassword').val())
				.done(function() {
					$('#loginModal').modal('hide');
				});
		});

		$('.logout-link').on('click.mkstats', function(e) {
			e.preventDefault();
			userLogout();
		});

		$('.index-page .tournaments').on('click.mkstats', 'tr', function(e) {
			var tournament_id = $(this).data('id');
			if (tournament_id !== undefined) {
				MK.nav.goTo('tournament', {id:tournament_id});
			}
		});

		$('#add-race-results').on('click.mkstats', function(e) {
			e.preventDefault();
			if (model.flag.loggedIn()) {
				model.flag.enableRaceResultsSelection = true;
				$('.selection-status').show();
				$('.race-rank').show();
				$('#clear-unsaved-race-results').show();
				$('#reset-unsaved-race-results').show();
			}
		});

		$('#clear-unsaved-race-results').on('click.mkstats', function(e) {
			e.preventDefault();
			resetRaceResults();
		});

		$('#reset-unsaved-race-results').on('click.mkstats', function(e) {
			e.preventDefault();
			resetRaceResults();
			$('#add-race-results').click();
		});

		$('#save-race-results').on('click.mkstats', function(e) {
			e.preventDefault();
			var update_object = {};
			$.each(model.collection.raceResults, function(rank, player_id) {
				rank = rank + 1;
				var player_row = $('.tournament-page .player-list tr.player[data-id="' + player_id + '"]'),
					field_to_update = '';
				switch (rank) {
					case 1: field_to_update = 'first'; break;
					case 2: field_to_update = 'second'; break;
					case 3: field_to_update = 'third'; break;
					case 4: field_to_update = 'fourth'; break;
					case 5: field_to_update = 'fifth'; break;
					case 6: field_to_update = 'sixth'; break;
					case 7: field_to_update = 'seventh'; break;
					case 8: field_to_update = 'eighth'; break;
					case 9: field_to_update = 'ninth'; break;
					case 10: field_to_update = 'tenth'; break;
					case 11: field_to_update = 'eleventh'; break;
					case 12: field_to_update = 'twelfth'; break;
					default: //no-op
				}
				update_object[field_to_update] = player_id;
			});
            MK.api.getAjax({
                    url: customRestUrl('scoring/update-tournament-results'),
                    type: 'POST',
                    data: {
                        _realm: MK.api.getRealm(),
                        _token: MK.api.getToken(),
                        race_results: update_object
                    }
                }).done(function(response) {
					resetRaceResults();
					fetchTournament(MK.nav.getHashVar('id'));
                });
		});

		var resetRaceResults = function() {
			model.flag.enableRaceResultsSelection = false;
			model.collection.raceResults = [];
			$('.race-result-actions', '.tournament-page').removeClass('unsaved-changes');
			$('tr.player', '.tournament-page .player-list').addClass('not-in-race-results');
			$('#save-race-results').prop('disabled', false);
			$('.selection-status').hide();
			$('.selection-status .selected-count').text(0);
			$('.race-rank').hide();
			$('#clear-unsaved-race-results').hide();
			$('#reset-unsaved-race-results').hide();
			$('tr.player .race-rank').text('');
		};

		$('.tournament-page .player-list').on('click.mkstats', 'tr.player.not-in-race-results', function(e) {
			e.preventDefault();
			var player_id = $(this).data('id');
			if (model.flag.enableRaceResultsSelection && player_id !== undefined) {
				model.collection.raceResults.push(player_id);
				$('.selection-status .selected-count').text(model.collection.raceResults.length);
				// mark player row as in results so it can't be selected twice
				$(this).removeClass('not-in-race-results');
				$('.race-rank', this).text(model.collection.raceResults.length);
			} else {
				model.collection.raceResults = [];
			}
			// now that we've processed the click... toggle our dirty flags
			$('.race-result-actions', '.tournament-page').toggleClass('unsaved-changes', model.collection.raceResults.length!=0);
			// disable save button if we don't have every player selected
			$('#save-race-results').prop('disabled', model.collection.raceResults.length != model.single.tournament.player_count);
		});

		return MK;

	};

}) (jQuery, document, window);
