;(function($, document, window, ko, undefined) {

	"use strict";

	var DEBUG = true;

	if (!DEBUG) {
		console = console || {};
		console.log = function(){};
	}

	$.FeederStats = function(apiOptions) {

		// hook up our loading indicator... use jQuery built in since it's more resilient
		$(document).ajaxStart(function() {
			$('#loading-spinner').show();
			viewModel.flag.loading(true);
		});
		$(document).ajaxStop(function() {
			viewModel.flag.loading(false);
			$('#loading-spinner').hide();
		});

		var FeederStats = {
			api: null,
			nav: null,
			viewModel: null
		};

		var viewModel = {

			reset: function() {
				viewModel.flag.loading(false);
				viewModel.flag.isLoggedIn(false);
				viewModel.single.reading(null);
				viewModel.single.currentTemp(null);
				viewModel.single.weatherApiKey(null);
				viewModel.single.zipCode(null);
				viewModel.collection.readings([]);
			},

			single: {

				reading: ko.observable(null),

				currentTemp: ko.observable(null),

				weatherApiKey: ko.observable(null),

				zipCode: ko.observable(null)

			},

			collection: {

				readings: ko.mapping.fromJS([])

			},

			flag: {

				loading: ko.observable(false),

				isLoggedIn: ko.observable(false)

			}
		};

		var logout = function() {
			return api.logout().always(function() {
				api.setToken(null);
				viewModel.flag.isLoggedIn(false);
				nav.goTo('login');
			});
		};

		var fetchSystemConfig = function() {
			if (viewModel.single.weatherApiKey()==null || viewModel.single.zipCode()==null) {
				return api.view('system_config', {'id':1})
					.done(function(response) {
						viewModel.single.zipCode(response.zip);
						viewModel.single.weatherApiKey(response.openweathermap_api_key);
					});
			}
			return $.Deferred().resolve().promise();
		};

		var fetchWeather = function() {
			if (viewModel.single.currentTemp()==null) {
				return $.ajax({
					'url': 'http://api.openweathermap.org/data/2.5/weather?'
							+ 'zip=' + viewModel.single.zipCode()
							+ '&appid=' + viewModel.single.weatherApiKey()
							+ '&units=imperial',
					'method': 'GET'
				}).done(function(response) {
					viewModel.single.currentTemp(response.main.temp);
				});
			}
		};

		var fetchReadings = function() {
			if (viewModel.collection.readings().length == 0) {
				return getDeferredFetchAllDetailsToKO('readings', 'meter', 1, 'read');
			}
			return $.Deferred().resolve().promise();
		};

		var fetchMeter = function() {
			if (viewModel.single.reading()==null) {
				return api.view('meter', {id:1})
					.done(function(response) {
						viewModel.single.reading(response.latest_reading);
					});
			}
			return $.Deferred().resolve().promise();
		};

		var checkLogin = function(page) {
			console.log("checkLogin");
			if (api.getToken()!=null) {
				console.log("check token");
				return api.ping().fail(function() {
					logout();
				}).done(function() {
					viewModel.flag.isLoggedIn(true);
					fetchSystemConfig();
				});
			}
			return logout();
		};

		/**
		 * given the results of an ajax fail, parse what we have available and
		 * come up with a suitable error message to return
		 *
		 * - try to parse the result as JSON.
		 *   - if that succeeds, then we see if there is a field-specific error
		 *	 set. if there is, do some formatting on the field name, it is
		 *	 likely underscored (eg first_name).
		 *   - if there's not a field-specific error, use the general error in
		 *	 the json if there is one, otherwise use the errorThrown.
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
					if (json.code == 403 && json.method == 'PUT') {
						// got a forbidden on updating... pull message as is
						text = json.error;
					} else {
						// required field missing
						text = "<span class='capitalize'>" + fieldName + "</span> is required. Please try again.";
					}
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
							if (myCallback !== undefined) {
								myCallback();
							}
						}
					}
				}
			});
		};

		$.fn.autoFocusForm = function() {
			if (viewModel.flag.hasPlaceholder()) {
				var self = this;
				// find the first blank select menu or non-checkbox/button input and focus it
				$.each($('input:not(:checkbox,:button):visible, select:visible', self), function(i, el) {
					if ($(el).val() == '') {
						$(el).focus();
						return false;
					}
				});
			}
		};

		$.fn.shakeElement = function() {
			var self = this, i;
			setTimeout(function() {
				for(i = 0; i < 10; i++) {
					if (i%2==0) {
						self.css('position', 'relative').animate( { 'left': '-10px' }, 75);
					} else {
						self.css('position', 'relative').animate( { 'left': '10px' }, 75);
					}
				}
				self.css('position', 'relative').animate( { 'left': '0' }, 60);
			}, 750);
		};

		/**
		 * FETCH ALL DETAIL RECORDS FUNCTIONS
		 */

		var getDeferredFetchAllDetailsToKO = function(collection, table, pkey, detailTable, settings, recordCallback) {
			var dataContainer = [];
			return getDeferredFetchAllDetails(dataContainer, table, pkey, detailTable, settings, recordCallback)
				.done(function(response, textStatus, jqXHR) {
					ko.mapping.fromJS(dataContainer, viewModel.collection[collection]);
				});
		};

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
			return api.browseDetail(table, pkey, detailTable, offset, settings)
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

		//** NAV **/

		var pageIn = {

			'*': function(page, showPage) {
				return checkLogin(page).done(function() {
					if (typeof(showPage)=='function') {
						showPage();
					}
				});
			},

			login: function(page, showPage) {
				return checkLogin(page).done(function() {
					nav.goTo('add-entry');
				}).fail(function() {
					console.log("login->fail");
					if (typeof(showPage)=='function') {
						showPage();
					}
				});
			},

			logout: function(page, showPage) {
				return logout();
			},

			'add-entry': function(page, showPage) {
				return checkLogin(page).done(function() {
					fetchMeter().always(function() {
						if (typeof(showPage)=='function') {
							showPage();
						}
					});
				});
			},

			stats: function(page, showPage) {
				return checkLogin(page).done(function() {
					fetchReadings().always(function() {
						if (typeof(showPage)=='function') {
							showPage();
						}
					});
				});
			}

		};

		var pageOut = {
		};

		var api = $.ParioAPI(apiOptions);

		var nav = $.Navigation({
			defaultPage: 'login',
			forceDefault: false,
			pageIns: pageIn,
			pageOuts: pageOut,
			wrapper: $('#main'),
			activateLinks: null,
			deactivateLinks: null
		});

		var setupKnockout = function() {

			ko.bindingHandlers.allowBindings = {
				init: function(elem, valueAccessor) {
					// Let bindings proceed as normal *only if* my value is false
					var shouldAllowBindings = ko.unwrap(valueAccessor());
					return { controlsDescendantBindings: !shouldAllowBindings };
				}
			};

			ko.bindingHandlers.nullText = {
				init: function(element, valueAccessor) {
					var value = valueAccessor();
					$(element).toggle(ko.unwrap(value) != undefined && ko.unwrap(value) != null);
					ko.bindingHandlers.text.update(element, valueAccessor);
				},
				update: function(element, valueAccessor) {
					var value = valueAccessor();
					$(element).toggle(ko.unwrap(value) != undefined && ko.unwrap(value) != null);
					ko.bindingHandlers.text.update(element, valueAccessor);
				}
			};

			/* hook up knockout to observables */
			ko.applyBindings(viewModel);

			viewModel.single.weatherApiKey.subscribe(function(newValue) {
				if (newValue!=null && viewModel.single.zipCode()!=null) {
					fetchWeather();
				}
			}, 'change');
			viewModel.single.zipCode.subscribe(function(newValue) {
				if (newValue!=null && viewModel.single.weatherApiKey()!=null) {
					fetchWeather();
				}
			}, 'change');
		};

		var init = function() {
			setupKnockout();
		};

		init();

		$('#loginForm').unbind('submit');
		$('#loginForm button[type=submit]', '.login-page').bind('click.et', function(e) {
			e.preventDefault();
			var user, pass;
			user = $('#loginUsername').val();
			pass = $('#loginPassword').val();
			api.login(user, pass)
				.done(function(response) {
					viewModel.flag.isLoggedIn(true);
					nav.goTo('add-entry');
				}).fail(function(jqXHR, textStatus, errorThrown) {
					showDangerBootbox(getFailureError(jqXHR, textStatus, errorThrown));
				});
		});

		$('#addEntryForm').unbind('submit');
		$('#addEntryForm button[type=submit]', '.add-entry-page').bind('click.et', function(e) {
			e.preventDefault();
			var reading = viewModel.single.reading(),
				temp = viewModel.single.currentTemp();
			if (reading==null) {
				showDangerBootbox("Add a Reading value");
			}
			api.insert('read', {
				'meter_id': 1,
				'reading': reading,
				'outside_temp': temp
			}).done(function(response) {
				// force stats refresh
				viewModel.collection.readings([]);
				nav.goTo('stats');
			}).fail(function(jqXHR, textStatus, errorThrown) {
				showDangerBootbox(getFailureError(jqXHR, textStatus, errorThrown));
			});
		});
		$('#addEntryForm input[type=number]', '.add-entry-page').keypress(function(e) {
			if (e.which == 13) {
				$('#addEntryForm button[type=submit]').click();
				return false;
			}
		})

		$(window).hashchange(function(e) {
			//collapse menu for mobile
			$('.navbar-collapse').removeClass('in');
			$('.navbar-toggle').addClass('collapsed');
		});

		FeederStats.api = api;
		FeederStats.nav = nav;
		FeederStats.viewModel = viewModel;

		return FeederStats;

	};

})(jQuery, document, window, ko);
