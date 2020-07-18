import type { Player } from "../room-activity";
import type { Room } from "../rooms";
import type { IGameFile, IGameFormat } from "../types/games";
import type { User } from "../users";
import { game as guessingGame, Guessing } from "./templates/guessing";

const data: {'Characters': string[]; 'Locations': string[]; 'Pokemon': string[]; 'Pokemon Abilities': string[];
	'Pokemon Items': string[]; 'Pokemon Moves': string[];} = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];

class HypnosHunches extends Guessing {
	currentCategory: string = '';
	guessLimit: number = 10;
	guessedLetters: string[] = [];
	hints: string[] = [];
	incorrectGuessTime: number = 4000;
	solvedLetters: string[] = [];
	uniqueLetters: number = 0;
	lastAnswer: string = '';
	letters: string[] = [];
	roundGuesses = new Map<Player, boolean>();
	roundTime: number = 15 * 1000;

	static loadData(room: Room | User): void {
		data["Characters"] = Dex.data.characters.slice();
		data["Locations"] = Dex.data.locations.slice();
		data["Pokemon"] = Games.getPokemonList().map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		this.currentCategory = category;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = this.sampleOne(data[category]);
		}
		this.lastAnswer = answer;
		this.answers = [answer];
		this.solvedLetters = [];
		this.guessedLetters = [];
		const letters = answer.split("");
		this.letters = letters;
		const id = Tools.toId(answer).split("");
		const uniqueLetters: string[] = [];
		for (const letter of id) {
			if (!uniqueLetters.includes(letter)) uniqueLetters.push(letter);
		}
		this.uniqueLetters = uniqueLetters.length;
		this.hints = new Array(letters.length).fill('') as string[];
	}

	updateHint(): void {
		if (this.timeout) this.timeout = null;
		this.roundGuesses.clear();
		for (let i = 0; i < this.letters.length; i++) {
			const id = Tools.toId(this.letters[i]);
			if (this.solvedLetters.includes(id)) this.hints[i] = id;
		}
		this.hint = "<b>" + this.currentCategory + "</b> | " + this.hints.join("") + (this.guessedLetters.length ?
			' | <font color="red">' + this.guessedLetters.join(", ") + '</font>' : "");
	}

	onHintHtml(): void {
		let ended = false;
		if (this.guessedLetters.length >= this.guessLimit) {
			this.say("All guesses have been used! The answer was __" + this.answers[0] + "__");
			ended = true;
		} else if (this.solvedLetters.length >= this.uniqueLetters) {
			this.say("All letters have been revealed! The answer was __" + this.answers[0] + "__");
			ended = true;
		}

		if (ended) {
			if (this.isMiniGame) {
				this.end();
			} else {
				this.answers = [];
				if (this.timeout) clearTimeout(this.timeout);
				this.timeout = setTimeout(() => this.nextRound(), 5000);
			}
			return;
		}
	}

	filterGuess(guess: string): boolean {
		guess = Tools.toId(guess);
		if (this.guessedLetters.includes(guess) || this.solvedLetters.includes(guess) ||
			guess.length > Tools.toId(this.answers[0]).length) return true;
		return false;
	}

	onIncorrectGuess(player: Player, guess: string): string {
		guess = Tools.toId(guess);
		if (!this.timeout) {
			this.timeout = setTimeout(() => this.nextRound(), this.incorrectGuessTime);
		}
		for (const letter of this.letters) {
			if (Tools.toId(letter) === guess) {
				if (!this.solvedLetters.includes(guess)) {
					this.solvedLetters.push(guess);
					if (this.solvedLetters.length === this.uniqueLetters) return this.answers[0];
				}
				return '';
			}
		}
		this.guessedLetters.push(guess);
		return '';
	}
}

export const game: IGameFile<HypnosHunches> = Games.copyTemplateProperties(guessingGame, {
	aliases: ["hypnos"],
	category: 'identification',
	class: HypnosHunches,
	customizableOptions: {
		points: {min: 5, base: 5, max: 5},
	},
	description: "Players guess letters to reveal the answers without being shown any blanks!",
	formerNames: ["Hunches"],
	freejoin: true,
	name: "Hypno's Hunches",
	mascot: "Hypno",
	minigameCommand: 'hunch',
	minigameDescription: 'Use ``' + Config.commandCharacter + 'g`` to guess one letter per round or the answer (no blanks shown)!',
	modes: ['survival', 'group'],
	modeProperties: {
		'survival': {
			guessLimit: 4,
			incorrectGuessTime: 1000,
		},
	},
	variants: [
		{
			name: "Hypno's Ability Hunches",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Hypno's Character Hunches",
			variant: "Characters",
			variantAliases: ['character'],
		},
		{
			name: "Hypno's Item Hunches",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Hypno's Location Hunches",
			variant: "Locations",
			variantAliases: ['location'],
		},
		{
			name: "Hypno's Move Hunches",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Hypno's Pokemon Hunches",
			variant: "Pokemon",
		},
	],
});
