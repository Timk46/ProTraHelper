import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FillinQuestionType } from '@DTOs/fillInType.enum';
import { UserFillinAnswer } from '@DTOs/userAnswer.dto';

@Component({
  selector: 'app-dynamic-blank',
  templateUrl: './dynamic-blank.component.html',
  styleUrls: ['./dynamic-blank.component.scss']
})
export class DynamicBlankComponent {

  @Input() id: string | null = '';
  @Input() otherBlankIds: string[] = [];
  @Input() blankMode: string = FillinQuestionType.FillinText;
  @Input() blankOptions: string[] = [];

  @Output() valueChange = new EventEmitter<UserFillinAnswer>();

  protected fillinTypes = FillinQuestionType;
  protected answer: string = '';

  ngOnInit() {
    console.log('im a blank!', this.id, 'myOptions:', this.blankOptions, 'otherBlanks:', this.otherBlankIds);
  }

  /**
   * Handles the value change event.
   * Emits an event with the position and answer if the id is defined.
   *
   * @returns {void}
   */
  onValueChange() {
    if (!this.id) return;
    this.valueChange.emit({position: this.id.slice(4), answer: this.answer});
  }

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else if (this.blankOptions.length < 1) {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
    this.answer = this.blankOptions[0] || '';
    this.onValueChange();
  }

  // we need to bind the this, because the function is called from the template
  canDrop = (): boolean => {
    if (this.blankOptions && this.blankOptions.length >= 1) {
      return false;
    } else {
      return true;
    }
  }

}
