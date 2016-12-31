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

			winner: ko.observable(null),

			goStop: function() {
				viewModel.paused(!viewModel.paused());
			},

			nextWord: function() {
				if (viewModel.timeLeft()>1) {
					// >1 so we can't jump past 0
					viewModel.timeLeft(viewModel.timeLeft()-2);
				}
			},

			incrementTeam1Score: function() {
				viewModel.team1Score(viewModel.team1Score()+1);
			},

			decrementTeam1Score: function() {
				viewModel.team1Score(viewModel.team1Score()-1);
			},

			resetTeam1Score: function() {
				viewModel.team1Score(0);
			},

			incrementTeam2Score: function() {
				viewModel.team2Score(viewModel.team2Score()+1);
			},

			decrementTeam2Score: function() {
				viewModel.team2Score(viewModel.team2Score()-1);
			},

			resetTeam2Score: function() {
				viewModel.team2Score(0);
			}

		};

		/**
		 * flash an element a few times and then hide it after a delay
		 */
		$.fn.flashAndHideElement = function(p_times, p_speed, p_delay) {
			var self = this, i, speed = 'slow', delay = 3000, times = 2;
			if (p_times !== undefined) {
				times = p_times;
			}
			if (p_speed !== undefined) {
				speed = p_speed;
			}
			if (p_delay !== undefined) {
				delay = p_delay;
			}
			for(i = 0; i < times; i++) {
				self.fadeIn(speed);
				self.fadeOut(speed);
			}
			self.fadeIn(speed).queue(function() {
				$(this).dequeue();
				setTimeout(function() {
					self.fadeOut(speed);
				}, delay);
			});
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
					$('#end-of-round').flashAndHideElement(2, 400, 2000);
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
			viewModel.team1Score.subscribe(function(newValue) {
				if (viewModel.winner()===null && newValue>=7) {
					viewModel.winner(1);
				} else if (viewModel.winner()==1 && newValue<7) {
					viewModel.winner(null);
				} 
			});
			viewModel.team2Score.subscribe(function(newValue) {
				if (viewModel.winner()===null && newValue>=7) {
					viewModel.winner(2);
				} else if (viewModel.winner()==2 && newValue<7) {
					viewModel.winner(null);
				} 
			});
			viewModel.winner.subscribe(function(newValue) {
				if (newValue!==null) {
					$('#end-of-round').flashAndHideElement(4, 400, 3000);
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

