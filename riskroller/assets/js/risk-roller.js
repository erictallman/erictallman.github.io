(function($, document, window, ko, undefined) {

	"use strict";

	$.riskAD = function() {

		var riskAD = {
			viewModel: null
		};

		var runningIntervalFunction = null;

		var viewModel = {

			attackingCount: ko.observable(3),

			defendingCount: ko.observable(2),

			countToCompare: ko.computed({read: function() {
				return Math.min(viewModel.attackingCount(), viewModel.defendingCount());
			}, deferEvaluation: true}),

			attackingRemainingCount: ko.observable(null),

			defendingRemainingCount: ko.observable(null),

			secondDelay: ko.observable(1),

			running: ko.observable(false),

			attackRolls: ko.observableArray([]),

			defendRolls: ko.observableArray([]),

			winningRolls: ko.observableArray([]),

			paused: ko.observable(false),

			togglePause: function() {
				viewModel.paused(!viewModel.paused());
			},

			startRolloff: function() {
				viewModel.running(true);
			},

			stopRolloff: function() {
				viewModel.running(false);
				if (viewModel.attackingCount()==0 || viewModel.defendingCount()==0) {
					reset();
				}
			},

			readyToRun: ko.computed({read: function() {
				return viewModel.attackingRemainingCount()!=null
					&& viewModel.attackingCount()>0
					&& viewModel.attackingCount()<viewModel.attackingRemainingCount()
					&& viewModel.defendingRemainingCount()!=null
					&& viewModel.defendingCount()>0
					&& viewModel.defendingCount()<=viewModel.defendingRemainingCount();
			}, deferEvaluation: true})

		};

		var rolloff = function() {
			var attackRoll,
				defendRoll,
				i;

			if (viewModel.running() && viewModel.readyToRun() && !viewModel.paused()) {
				// remove last round
				viewModel.attackRolls.removeAll();
				viewModel.defendRolls.removeAll();
				viewModel.winningRolls.removeAll();

				// roll attack dice
				for (i=0; i<viewModel.attackingCount(); i++) {
					viewModel.attackRolls.push(getDieRoll());
				}
				viewModel.attackRolls.sort(function(a,b){return b-a});

				// roll defend dice
				for (i=0; i<viewModel.defendingCount(); i++) {
					viewModel.defendRolls.push(getDieRoll());
				}
				viewModel.defendRolls.sort(function(a,b){return b-a});

				// figure out the winners
				for (i=0; i<viewModel.countToCompare(); i++) {
					if (viewModel.attackRolls()[i] > viewModel.defendRolls()[i]) {
						// attacker wins
						viewModel.winningRolls.push('a-win');
						viewModel.defendingRemainingCount(viewModel.defendingRemainingCount()-1);
					} else {
						// defender wins
						viewModel.winningRolls.push('d-win');
						viewModel.attackingRemainingCount(viewModel.attackingRemainingCount()-1);
					}
				}
			} else if (!(viewModel.readyToRun() && viewModel.running())) {
				if (runningIntervalFunction !== null) {
					clearInterval(runningIntervalFunction);
					viewModel.paused(false);
				}
				bootbox.dialog({
					title: "Results",
					message: "<h5>Remaining Attacking Armies: " + viewModel.attackingRemainingCount() + "</h5>"
							+ "<h5>Remaining Defending Armies: " + viewModel.defendingRemainingCount() + "</h5>"
							+ (viewModel.defendingRemainingCount()==0
								?"<h5>Attacker must advance at least " + viewModel.attackingCount()
										+ (viewModel.attackingCount()==1?" army":" armies")
										+ " leaving at least 1 behind</h5>"
								:""
							),
					closeButton: false,
					onEscape: function() {
						$('#stopTimerButton').click();
					},
					buttons: {
						main: {
							label: 'OK',
							className: 'btn-primary',
							callback: function() {
								$('#stopTimerButton').click();
							}
						}
					}
				});
			}
		};

		var getDieRoll = function() {
			var min = 1;
			var max = 6;
			return Math.floor(Math.random() * (max - min + 1)) + min;
		};

		var reset = function() {
			viewModel.attackRolls([]);
			viewModel.defendRolls([]);
			viewModel.winningRolls([]);
			viewModel.attackingCount(3);
			viewModel.attackingRemainingCount(null);
			viewModel.defendingCount(2);
			viewModel.defendingRemainingCount(null);
			viewModel.paused(false);

			/**
			 * viewModel.attackingCount(3);
			 * viewModel.defendingCount(2);
			 * viewModel.running(false);
			 * viewModel.secondDelay(1);
			 */
		};

		var setupKnockout = function() {
			/* hook up knockout to observables */
			ko.applyBindings(viewModel);
			viewModel.running.subscribe(function(newValue) {
				if (newValue && viewModel.readyToRun()) {
					$('#settingsPanel').collapse('hide');
					$('#scoringPanel').collapse('show');
					runningIntervalFunction = setInterval(rolloff, 1000*viewModel.secondDelay());
				} else {
					// turning it off or we're no longer able to run
					if (runningIntervalFunction !== null) {
						clearInterval(runningIntervalFunction);
						viewModel.paused(false);
					}
					$('#settingsPanel').collapse('show');
					$('#scoringPanel').collapse('hide');
				}
			});
			viewModel.attackingRemainingCount.subscribe(function(newValue) {
				var actualCount = null;
				if (newValue != null) {
					if (viewModel.attackingCount() > newValue) {
						// need to leave one behind
						actualCount = newValue - 1;
					} else if (viewModel.attackingCount() < newValue) {
						// we have at least one more than we're attacking with
						actualCount = viewModel.attackingCount();
					} else {
						// we're attacking with x but only have x left, remove 1
						actualCount = viewModel.attackingCount() - 1;
					}
					viewModel.attackingCount(actualCount);
				}
			});
			viewModel.defendingRemainingCount.subscribe(function(newValue) {
				var actualCount = null;
				if (newValue != null) {
					actualCount = Math.min(viewModel.defendingCount(), newValue);
					viewModel.defendingCount(actualCount);
				}
			});
		};

		var init = function() {
			setupKnockout();
		};

		riskAD.viewModel = viewModel;
		init();

		return riskAD;
	};

})(jQuery, document, window, ko);

