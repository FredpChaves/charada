import {Component, ElementRef, HostListener, QueryList, ViewChild, ViewChildren} from '@angular/core';
import { timeout } from 'rxjs';
import { WORDS } from './wordlist';

const wordLenght = 5;
const tries = 6;

const letters = (() => {
  const ret: {[key: string]: boolean} = {};
  for (let charCode = 97; charCode < 97 + 26; charCode++) {
    ret[String.fromCharCode(charCode)] = true;
  }
  return ret;
})();

interface Try {
  letters: Letters[];
}

interface Letters {
  text: string;
  state: LetterState;
}

enum LetterState {
  WRONG,
  PARTIAL_MATCH,
  FULL_MATCH,
  PENDING,
}

@Component({
  selector: 'charada',
  templateUrl: './charada.component.html',
  styleUrls: ['./charada.component.css'],
})
export class Charada {
  @ViewChildren('tryContainer') tryContainers!: QueryList<ElementRef>;
  readonly tries: Try[] = [];
  readonly LetterState = LetterState;
  readonly keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace'],
  ];
  readonly curLetterStates: {[key: string]: LetterState} = {};

  msg = '';
  fadeOutInfoMsg = false;
  showShareDialogContainer = false;
  showShareDialog = false;

  private palavraCerta = '';

  private currentLetterIndex = 0;

  private submittedTries = 0;
  
  private palavraCertaLetterCounts: {[letter: string]: number} = {};

  private ganhou = false;

  constructor(){
    for(let i = 0; i < tries; i++){
      const letters: Letters[] = [];
      for(let j = 0; j < wordLenght; j++){
        letters.push({text: '', state: LetterState.PENDING})
      }
      this.tries.push({letters})
    }

    const numeroPalavras = WORDS.length;
    while(true) {
      const index = Math.floor(Math.random() * numeroPalavras);
      const word = WORDS[index];

      if(word.length === wordLenght) {
        this.palavraCerta = word.toLowerCase();
        break;
      }
    }
    console.log('PALAVRA CERTA: ', this.palavraCerta);
    for (const letter of this.palavraCerta) {
      const count = this.palavraCertaLetterCounts[letter];
      if (count == null) {
        this.palavraCertaLetterCounts[letter] = 0;
      }
      this.palavraCertaLetterCounts[letter]++;
    }
    console.log(this.palavraCertaLetterCounts);
  }
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    this.handleClickKey(event.key);
  }
  getKeyClass(key: string): string {
    const state = this.curLetterStates[key.toLowerCase()];
    switch (state) {
      case LetterState.FULL_MATCH:
        return 'match key';
      case LetterState.PARTIAL_MATCH:
        return 'partial key';
      case LetterState.WRONG:
        return 'wrong key';
      default:
        return 'key';
    }
  }

  private handleClickKey(key: string) {
    if(letters[key.toLowerCase()]) {
      if(this.currentLetterIndex < (this.submittedTries + 1) * wordLenght){
        this.setLetter(key);
        this.currentLetterIndex++;
      }
    }
    else if(key === 'Backspace'){
      if (this.currentLetterIndex > this.submittedTries * wordLenght){
        this.currentLetterIndex--;
        this.setLetter('');
      }
    }
    else if(key === 'Enter'){
      this.checkTry();

  }
  }

  private checkTry() {
    const currentTryIndex = this.tries[this.submittedTries];
    if (currentTryIndex.letters.some(letter => letter.text === '')) {
      return;
    }
    ///const palavraUsadaCurrentTry = currentTryIndex.letters.map(letter => letter.text).join('').toUpperCase;
    ///if(!WORDS.includes(palavraUsadaCurrentTry)){
    ///  return;
    ///}
  }
  handleClickShare() {
    // 🟩🟨⬜
    // Copy results into clipboard.
    let clipboardContent = '';
    for (let i = 0; i < this.submittedTries; i++) {
      for (let j = 0; j < wordLenght; j++) {
        const letter = this.tries[i].letters[j];
        switch (letter.state) {
          case LetterState.FULL_MATCH:
            clipboardContent += '🟩';
            break;
          case LetterState.PARTIAL_MATCH:
            clipboardContent += '🟨';
            break;
          case LetterState.WRONG:
            clipboardContent += '⬜';
            break;
          default:
            break;
        }
      }
      clipboardContent += '\n';
    }
    console.log(clipboardContent);
    navigator.clipboard.writeText(clipboardContent);
    this.showShareDialogContainer = false;
    this.showShareDialog = false;
    this.showInfoMessage('Copied results to clipboard');
  }

  private setLetter(letter: string) {
    const tryIndex = Math.floor(this.currentLetterIndex / wordLenght);
    const letterIndex = this.currentLetterIndex - tryIndex * wordLenght;
    this.tries[tryIndex].letters[letterIndex].text = letter;
  }

  private async checkCurrentTry() {
    // Check if user has typed all the letters.
    const curTry = this.tries[this.submittedTries];
    if (curTry.letters.some(letter => letter.text === '')) {
      this.showInfoMessage('Not enough letters');
      return;
    }

    // Check if the current try is a word in the list.
    const wordFromCurTry =
        curTry.letters.map(letter => letter.text).join('').toUpperCase();
    if (!WORDS.includes(wordFromCurTry)) {
      this.showInfoMessage('Not in word list');
      // Shake the current row.
      const tryContainer =
          this.tryContainers.get(this.submittedTries)?.nativeElement as
          HTMLElement;
      tryContainer.classList.add('shake');
      setTimeout(() => {
        tryContainer.classList.remove('shake');
      }, 500);
      return;
    }
    const targetWordLetterCounts = {...this.palavraCertaLetterCounts};
    const states: LetterState[] = [];
    for (let i = 0; i < wordLenght; i++) {
      const expected = this.palavraCerta[i];
      const curLetter = curTry.letters[i];
      const got = curLetter.text.toLowerCase();
      let state = LetterState.WRONG;
      if (expected === got && targetWordLetterCounts[got] > 0) {
        targetWordLetterCounts[expected]--;
        state = LetterState.FULL_MATCH;
      } else if (
          this.palavraCerta.includes(got) && targetWordLetterCounts[got] > 0) {
        targetWordLetterCounts[got]--
        state = LetterState.PARTIAL_MATCH;
      }
      states.push(state);
    }
    console.log(states);

    // Animate.
    // Again, there must be a more angular way to do this, but...

    // Get the current try.
    const tryContainer =
        this.tryContainers.get(this.submittedTries)?.nativeElement as
        HTMLElement;
    // Get the letter elements.
    const letterEles = tryContainer.querySelectorAll('.letter-container');
    for (let i = 0; i < letterEles.length; i++) {
      const curLetterEle = letterEles[i];
      curLetterEle.classList.add('fold');
      await this.wait(180);
      curTry.letters[i].state = states[i];
      curLetterEle.classList.remove('fold');
      await this.wait(180);
    }
    for (let i = 0; i < wordLenght; i++) {
      const curLetter = curTry.letters[i];
      const got = curLetter.text.toLowerCase();
      const curStoredState = this.curLetterStates[got];
      const targetState = states[i];
      if (curStoredState == null || targetState > curStoredState) {
        this.curLetterStates[got] = targetState;
      }
    }
    this.submittedTries++;

    // Check if all letters in the current try are correct.
    if (states.every(state => state === LetterState.FULL_MATCH)) {
      this.showInfoMessage('NICE!');
      this.ganhou = true;
      // Bounce animation.
      for (let i = 0; i < letterEles.length; i++) {
        const curLetterEle = letterEles[i];
        curLetterEle.classList.add('bounce');
        await this.wait(160);
      }
      this.showShare();
      return;
    }

    // Running out of tries. Show correct answer.
    //
    // If you can hear, my heater is on.. sorry about that!
    if (this.submittedTries === tries) {
      // Don't hide it.
      this.showInfoMessage(this.palavraCerta.toUpperCase(), false);
      this.showShare();
    }
  }

  private showInfoMessage(msg: string, hide = true) {
    this.msg = msg;
    if (hide) {
      // Hide after 2s.
      setTimeout(() => {
        this.fadeOutInfoMsg = true;
        // Reset when animation is done.
        // Sorry, little bit hacky here.
        setTimeout(() => {
          this.msg = '';
          this.fadeOutInfoMsg = false;
        }, 500);
      }, 2000);
    }
  }

  private async wait(ms: number) {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    })
  }

  private showShare() {
    setTimeout(() => {
      this.showShareDialogContainer = true;
      // Wait a tick till dialog container is displayed.
      setTimeout(() => {
        // Slide in the share dialog.
        this.showShareDialog = true;
      });
    }, 1500);
  }
  private showMsg(msg: string) {
    this.msg = msg;

    setTimeout(() => {
      this.fadeOutInfoMsg = true;
      setTimeout(() => {
        this.msg = '';
        this.fadeOutInfoMsg = false;
      }, 500);
    }, 3000);
  }

 


}
