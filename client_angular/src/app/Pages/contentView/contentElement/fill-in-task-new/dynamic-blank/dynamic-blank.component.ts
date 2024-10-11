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
  @Input() blankMode: string = FillinQuestionType.FillinText;
  @Input() blankOptions: string[] = [];

  @Output() valueChange = new EventEmitter<UserFillinAnswer>();

  protected fillinTypes = FillinQuestionType;
  protected answer: string = '';

  ngOnInit() {
    //console.log('im a blank!', this.id, 'myOptions:', this.blankOptions);
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

}
