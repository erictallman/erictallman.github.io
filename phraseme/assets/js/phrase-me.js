(function($, document, window, ko, undefined) {

	"use strict";

	$.phraseMe = function() {

		var phraseMe = {
			viewModel: null
		};

		var runningIntervalFunction = null;

		var viewModel = {

			team1Score: ko.observable(0),

			team2Score: ko.observable(0),

			category: ko.observable(null),

			word: ko.observable(null),

			timeLeft: ko.observable(60),

			running: ko.observable(false),

			paused: ko.observable(false),

			goStop: function() {
				viewModel.paused(!viewModel.paused());
			},

			nextWord: function() {
				viewModel.running(true);
			}

		};

		var setupKnockout = function() {
			/* hook up knockout to observables */
			ko.applyBindings(viewModel);
		};

		var init = function() {
			setupKnockout();
		};

		phraseMe.viewModel = viewModel;
		init();

		return phraseMe;
	};

})(jQuery, document, window, ko);

