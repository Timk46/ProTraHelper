import type { discussionDTO } from '@DTOs/index';
import type { OnChanges } from '@angular/core';
import { Component, Input } from '@angular/core';
import type { ScreenSizeService } from 'src/app/Services/mobile/screen-size.service';

@Component({
  selector: 'app-discussion-list-item',
  templateUrl: './discussion-list-item.component.html',
  styleUrls: ['./discussion-list-item.component.scss'],
})
export class DiscussionListItemComponent implements OnChanges {
  readableDate: string = 'dummy date';

  @Input() questionData: discussionDTO = {
    id: -1,
    initMessageId: -1,
    title: 'dummy question',
    authorName: 'dummy author',
    createdAt: new Date(),
    contentNodeName: 'dummy content node',
    commentCount: 0,
    isSolved: false,
  };

  constructor(public sSS: ScreenSizeService) {}

  ngOnChanges() {
    if (
      this.questionData.id != -1 &&
      this.questionData.createdAt != null &&
      this.readableDate == 'dummy date'
    ) {
      this.readableDate = this.getDateDisplay(this.questionData.createdAt);
    }
  }

  /**
   * Returns the date in a human readable format, e.g. "heute" or "1. 1. 2021"
   * @param date
   * @returns
   */
  getDateDisplay(date: Date): string {
    //console.log("getDateDisplay called");
    const today = new Date();
    const newDate = new Date(date);
    today.setHours(0, 0, 0, 0); // set time to 00:00:00.000
    if (newDate.setHours(0, 0, 0, 0) === today.getTime()) {
      return 'heute';
    } else {
      return `${newDate.getDate()}.${newDate.getMonth() + 1}.${newDate.getFullYear()}`;
    }
  }
}
