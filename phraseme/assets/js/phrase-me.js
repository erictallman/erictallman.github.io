(function($, document, window, ko, undefined) {

	"use strict";

	$.phraseMe = function() {

		var phraseMe = {
			viewModel: null
		};

		var countdownIntervalFunction = null;
		var runningIntervalFunction = null;

		var countdownFunc = function() {
			if (viewModel.timeLeft()>0) {
				viewModel.timeLeft(viewModel.timeLeft()-1);
			}
		};

		var runningFunc = function() {
			$.ionSound.play('snap');
		};

		var words = [];

		var viewModel = {

			team1Score: ko.observable(0),

			team2Score: ko.observable(0),

			word: ko.observable(null),

			timeLeft: ko.observable(60),

			paused: ko.observable(true),

			repeatSpeed: ko.observable(1500),

			goStop: function() {
				viewModel.paused(!viewModel.paused());
			},

			nextWord: function() {
				if (viewModel.timeLeft()>1) {
					// >1 so we can't jump past 0
					viewModel.timeLeft(viewModel.timeLeft()-2);
				}
			}

		};

		var setupKnockout = function() {
			/* hook up knockout to observables */
			ko.applyBindings(viewModel);
			viewModel.timeLeft.extend({rateLimit: 100});
			viewModel.timeLeft.subscribe(function(newValue) {
				console.log("time left: " + newValue);
				if (newValue > 30 && newValue < 46) {
					viewModel.repeatSpeed(1200);
				} else if (newValue > 15 && newValue < 31) {
					viewModel.repeatSpeed(1000);
				} else if (newValue > 0 && newValue < 16) {
					viewModel.repeatSpeed(500);
				} else if (newValue <= 0) {
					viewModel.repeatSpeed(1500);
					viewModel.timeLeft(60);
					viewModel.goStop();
					$.ionSound.play('bell_ring');
				}
			});
			viewModel.paused.subscribe(function(newValue) {
				if (newValue) {
					console.log("paused... tearing down");
					if (countdownIntervalFunction !== null) {
						clearTimeout(countdownIntervalFunction);
						countdownIntervalFunction = null;
					}
					if (runningIntervalFunction !== null) {
						clearTimeout(runningIntervalFunction);
						runningIntervalFunction = null;
					}
				} else {
					console.log("not paused... queuing up");
					countdownIntervalFunction = setInterval(countdownFunc, 1000);
					runningIntervalFunction = setInterval(runningFunc, viewModel.repeatSpeed());
				}
			});
			viewModel.repeatSpeed.subscribe(function(newValue) {
				if (runningIntervalFunction !== null) {
					clearTimeout(runningIntervalFunction);
					runningIntervalFunction = null;
				}
				if (!viewModel.paused()) {
					runningIntervalFunction = setInterval(runningFunc, newValue);
				}
			});
		};

		var init = function() {
			setupKnockout();
			$.get('assets/data/all.txt', function(data) {
				words = $.grep(data.split("\n"), function(line) {
					return line!='' && line.indexOf('#')!=0;
				});
				console.log(words);
			});
			$.ionSound({
				sounds: [
					{
						alias: 'bell_ring',
						name: 'bell_ring'
					},
					{
						alias: 'snap',
						name: 'snap'
					}
				],
				path: "assets/vendor/ion.sound-3.0.7/sounds/",
				preload: true
			});
		};

		phraseMe.viewModel = viewModel;
		init();

		return phraseMe;
	};

})(jQuery, document, window, ko);

