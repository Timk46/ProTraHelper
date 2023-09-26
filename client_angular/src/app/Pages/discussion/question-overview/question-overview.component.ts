import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-question-overview',
  templateUrl: './question-overview.component.html',
  styleUrls: ['./question-overview.component.scss', '../discussion.component.css']
})
export class QuestionOverviewComponent {

  /* test content, removed when database communication is established */
  dummyQuestions = [
    {
      id: 0,
      title: 'Ist ein dictionary in Python mutable?',
      date: '01.01.2020',
      userId: 1,
      username: 'maxmuster253',
      contentNode: 1,
      contentNodeName: 'Python',
      votes: 0,
      solved: false,
      tags: ['Python', 'Dictionary', 'mutable'],
      commentCount: 1,
    },
    {
      id: 1,
      title: 'Wie kann ich in Python eine Datei öffnen?',
      date: '11.06.2022',
      userId: 1,
      username: 'mamamia!18',
      contentNode: 1,
      contentNodeName: 'Python',
      votes: 9,
      solved: false,
      tags: ['Python', 'Dateiverwaltung', 'öffnen'],
      commentCount: 0,
    },
    {
      id: 2,
      title: 'Wie kann ich in Java eine Datei öffnen?',
      date: '02.06.2023',
      userId: 1,
      username: 'dasisteintollerstudentenname',
      contentNode: 1,
      contentNodeName: 'Java',
      votes: 14,
      solved: true,
      tags: ['Java', 'Datei'],
      commentCount: 23,
    },
    {
      id: 3,
      title: 'Wie kann ich in C++ eine Datei öffnen?',
      date: '19.09.2021',
      userId: 1,
      username: '__Werbung97__',
      contentNode: 1,
      contentNodeName: 'C++',
      votes: 3,
      solved: false,
      tags: [],
      commentCount: 5,
    }
  ]
}
