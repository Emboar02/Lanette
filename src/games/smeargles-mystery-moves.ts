import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { AchievementsDict, IGameFile } from "../types/games";
import type { User } from "../users";
import { game as guessingGame, Guessing } from "./templates/guessing";

const data: {moves: string[]} = {
	moves: [],
};

const achievements: AchievementsDict = {
	"moverelearner": {name: "Move Relearner", type: 'all-answers', bits: 1000, description: 'get every answer in one game'},
};

class SmearglesMysteryMoves extends Guessing {
	allAnswersAchievement = achievements.moverelearner;
	answers: string[] = [];
	canGuess: boolean = false;
	hints: string[] = [];
	lastMove: string = '';
	mysteryRound: number = -1;
	points = new Map<Player, number>();
	roundGuesses = new Map<Player, boolean>();

	static loadData(room: Room | User): void {
		const movesList = Games.getMovesList();
		for (const move of movesList) {
			data.moves.push(move.name);
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		this.mysteryRound = -1;
		let name = this.sampleOne(data.moves);
		while (this.lastMove === name) {
			name = this.sampleOne(data.moves);
		}
		this.lastMove = name;
		const move = Dex.getExistingMove(name);
		const hints: string[] = [];
		hints.push("<b>Type</b>: " + move.type);
		hints.push("<b>Base PP</b>: " + move.pp);
		hints.push("<b>Category</b>: " + move.category);
		hints.push("<b>Accuracy</b>: " + (move.accuracy === true ? "does not check" : move.accuracy + "%"));
		if (move.category !== 'Status') hints.push("<b>Base power</b>: " + move.basePower);
		hints.push("<b>Description</b>: " + move.shortDesc);
		this.hints = this.shuffle(hints);
		this.answers = [move.name];
	}

	updateHint(): void {
		this.mysteryRound++;
		this.roundGuesses.clear();
		const pastHints = this.hints.slice(0, this.mysteryRound);
		this.hint = (pastHints.length ? pastHints.join("<br />") + "<br />" : "") + (this.hints[this.mysteryRound] ?
			"<i>" + this.hints[this.mysteryRound] + "</i>" : "");
	}

	onHintHtml(): void {
		if (!this.hints[this.mysteryRound]) {
			const text = "All hints have been revealed! " + this.getAnswers('');
			this.on(text, () => {
				this.answers = [];
				if (this.isMiniGame) {
					this.end();
					return;
				}
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			});
			this.say(text);
			return;
		} else {
			this.timeout = setTimeout(() => this.nextRound(), 5000);
		}
	}
}

export const game: IGameFile<SmearglesMysteryMoves> = Games.copyTemplateProperties(guessingGame, {
	achievements,
	aliases: ["smeargles", "mysterymoves", "smm", "wtm"],
	category: 'knowledge',
	commandDescriptions: [Config.commandCharacter + "g [move]"],
	class: SmearglesMysteryMoves,
	defaultOptions: ['points'],
	description: "Players guess moves based on the given hints!",
	formerNames: ["What's That Move"],
	freejoin: true,
	name: "Smeargle's Mystery Moves",
	mascot: "Smeargle",
	minigameCommand: "mysterymove",
	minigameCommandAliases: ["mmove"],
	minigameDescription: "Use ``" + Config.commandCharacter + "g`` to guess a move as hints are revealed!",
	modes: ['group'],
});
