import { StatusBarAlignment, StatusBarItem, window, workspace, MarkdownString, Uri } from "vscode";

import Pomodoro from "./pomodoro";
import PomodoroStatus from "./pomodoroStatus";

class PomodoroManager {
	// logic properties
	private _pomodoroIndex: number;
	public pomodori: Pomodoro[];

	public get currentPomodoro() {
		return this.pomodori[this._pomodoroIndex];
	}

	public get currentState() {
		switch (this.currentPomodoro.status) {
			case PomodoroStatus.Work:
				return " - work";
			case PomodoroStatus.Rest:
				return " - rest";
			case PomodoroStatus.Paused:
				return " - paused";
			case PomodoroStatus.Break:
				return " - break";
			default:
				return "";
		}
	}

	public get isSessionFinished(): boolean {
		return !this.currentPomodoro;
	}

	// UI properties
	private _statusBarText: StatusBarItem;
	private _statusBarStartButton: StatusBarItem;
	private _statusBarPauseButton: StatusBarItem;


	constructor(public workTime: number = 25, public pauseTime: number = 5, public isCountDown: boolean = true) {
		// create status bar items
		if (!this._statusBarText) {
			this._statusBarText = window.createStatusBarItem(StatusBarAlignment.Left, 3);
			this._statusBarText.show();
		}
		if (!this._statusBarStartButton) {
			this._statusBarStartButton = window.createStatusBarItem(StatusBarAlignment.Left);
			this._statusBarStartButton.text = "$(triangle-right)";
			this._statusBarStartButton.command = "pomodoro.startPomodoro";
			this._statusBarStartButton.tooltip = "Start Pomodoro";
		}
		if (!this._statusBarPauseButton) {
			this._statusBarPauseButton = window.createStatusBarItem(StatusBarAlignment.Left);
			this._statusBarPauseButton.text = "$(primitive-square)";
			this._statusBarPauseButton.command = "pomodoro.pausePomodoro";
			this._statusBarPauseButton.tooltip = "Pause Pomodoro";
		}

		this.reset();
		this.draw();
	}

	// private methods
	private update() {
		// handle launch of the next Pomodoro
		if (this.currentPomodoro.status === PomodoroStatus.Done) {
			this._pomodoroIndex++;

			if (!this.isSessionFinished) {
				this.start();
			}
		}
	}

	private draw() {
		if (this.isSessionFinished) {
			// show text when all Pomodoro sessions are over
			this._statusBarText.text = "Restart session?";
			this._statusBarStartButton.show();
			this._statusBarPauseButton.hide();

			// show message if user needs a longer break
			if (this.pomodori.length > 1) {
				window.showInformationMessage("Well done! You should now take a longer break.");
			}

			return;
		}

		// const minutes = (this.currentPomodoro.timer.currentTime - seconds) / 60;
		// const seconds = this.currentPomodoro.timer.currentTime % 60;
		let currentTime = this.currentPomodoro.timer.currentTime
		const config = workspace.getConfiguration("pomodoro");
		if (!this.isCountDown) {
			currentTime = this.workTime * 60 - this.currentPomodoro.timer.currentTime;
		}
		const seconds = currentTime % 60;
		const minutes = (currentTime - seconds) / 60;

		// update status bar (text)
		const timerPart = ((minutes < 10) ? "0" : "") + minutes + ":" + ((seconds < 10) ? "0" : "") + seconds;

		let pomodoroNumberPart = "";
		if (this.pomodori.length > 1) {
			pomodoroNumberPart += " (" + (this._pomodoroIndex + 1) + " out of " + this.pomodori.length + " pomodori)";
		}

		this._statusBarText.text = timerPart + this.currentState + pomodoroNumberPart;
		const markdown = new MarkdownString(`
|    <span style="color:#ff0;background-color:#000;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Table&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>|    Header     |
|    :----:    |    :----:     |
|first cell    |second cell  |
|third cell    |<span style="color:#f00;background-color:#fff;">&nbsp;&nbsp;fourth cell&nbsp;&nbsp;</span>  |
        \n\n\n`);

		const stageCommandUri = Uri.parse(
			`command:pomodoro.resetPomodoro`
		);
		const stageCommandUri2 = Uri.parse(
			`command:pomodoro.pausePomodoro`
		);
		// <a href="command:${command}">${text}</a>
		const btns = [
			`<a href="${stageCommandUri2}">${'pause'}</a>`,
			`<a href="${stageCommandUri}">${'reset'}</a>`,
		]
		const contents = new MarkdownString(btns.join('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'), true);
		// const contents = new MarkdownString(`[reset](${stageCommandUri})`, true);
		console.log("contents", contents);
		contents.isTrusted = true;
		contents.supportHtml = true;
		this._statusBarText.tooltip = contents;

		if (this.currentPomodoro.status === PomodoroStatus.None ||
			this.currentPomodoro.status === PomodoroStatus.Paused) {
			this._statusBarStartButton.show();
			this._statusBarPauseButton.hide();
		}
		else {
			this._statusBarStartButton.hide();
			this._statusBarPauseButton.show();
		}

		this._statusBarText.show();
	}

	// public methods
	public start() {
		// launch a new session if the previous is already finished
		if (this.isSessionFinished) {
			this._pomodoroIndex = 0;
		}

		this.currentPomodoro.start();
		this.currentPomodoro.onTick = () => {
			this.update();
			this.draw();
		};
	}

	public pause() {
		this.currentPomodoro.pause();

		this.update();
		this.draw();
	}

	public reset() {
		this._pomodoroIndex = 0;
		this.pomodori = [];

		this.pomodori.push(new Pomodoro(this.workTime * 60, this.pauseTime * 60));
	}

	public dispose() {
		// stop current Pomodoro
		this.currentPomodoro.dispose();

		// reset UI
		this._statusBarText.dispose();
		this._statusBarStartButton.dispose();
		this._statusBarPauseButton.dispose();
	}
}

export default PomodoroManager;