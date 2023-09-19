import { Component } from '@angular/core';

@Component({
  selector: 'app-question-overview',
  templateUrl: './question-overview.component.html',
  styleUrls: ['./question-overview.component.scss', '../discussion.component.css']
})
export class QuestionOverviewComponent {


  questions = [
    {
      title: 'Ist ein dictionary in Python mutable?',
      topic: 'Python',
    },
    {
      title: 'Wie kann ich in Python eine Datei öffnen?',
      topic: 'Python',
    },
    {
      title: 'Wie kann ich in Java eine Datei öffnen?',
      topic: 'Java',
    },
    {
      title: 'Wie kann ich in C++ eine Datei öffnen?',
      topic: 'C++',
    },
  ]
}
