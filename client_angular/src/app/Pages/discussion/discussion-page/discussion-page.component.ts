import { Component } from '@angular/core';

@Component({
  selector: 'app-discussion-page',
  templateUrl: './discussion-page.component.html',
  styleUrls: ['./discussion-page.component.scss', '../discussion.component.css']
})
export class DiscussionPageComponent {

  /* dummy data */
  questionData = {
    id: -1,
    title: 'Ist ein dictionary in Python mutable?',
    date: '01.01.2020',
    userId: -1,
    username: 'maxmuster253',
    contentNode: -1,
    contentNodeName: 'dummy',
    voteId: -1,
    votes: 0, /* Lieber mit voteId tauschen */
    solved: false,
    tags: ['dummy1', 'dummy2'],
    commentCount: 6,
    text: 'Als ich kürzlich an meinem Python-Projekt gearbeitet habe, stieß ich auf eine interessante Herausforderung. Ich verwendete ein Dictionary, um Daten zu speichern, und bemerkte, dass sich die Werte nach der Zuweisung scheinbar veränderten. Das brachte mich ins Grübeln - ist ein Dictionary in Python wirklich veränderbar? Könnte das der Grund für mein Problem sein? Könntet ihr mir bitte erklären, wie die Mutabilität von Dictionaries in Python funktioniert und ob es eine Möglichkeit gibt, sie vor ungewollten Änderungen zu schützen?'
  }

  /* dummy data to test */
  commentData = [
    {
      date: '01.01.2020',
      username: 'real_maxmuster253',
      voteId: 1,
      text: 'Ja, ein dictionary ist mutable. Aber ich würde dir empfehlen, nochmal in der Dokumentation nachzulesen, da steht alles drin.',
    },
    {
      date: '15.03.2021',
      username: 'codingqueen17',
      voteId: 2,
      text: 'Ja, Dictionaries in Python sind definitiv veränderbar. Ich hatte auch schon ähnliche Verwirrungen. Eine Möglichkeit, ungewollte Änderungen zu vermeiden, ist die Verwendung von copy() oder deepcopy() je nach Bedarf. Das hilft, unerwartete Seiteneffekte zu verhindern.'
    },
    {
      date: '07.05.2019',
      username: 'techgeek99',
      voteId: 3,
      text: 'Genau, Dictionaries sind mutable. Das ist einer der Gründe, warum sie so nützlich sind! Wenn du spezifische Probleme hast, könntest du den Code hier posten. Vielleicht können wir dann gemeinsam nach einer Lösung suchen.'
    },
    {
      date: '22.11.2018',
      username: 'datawizard42',
      voteId: 4,
      text: 'Es könnte auch hilfreich sein, die Unterschiede zwischen Mutable und Immutable Types in Python zu verstehen. Das beeinflusst, wie Objekte in Python behandelt werden. Dictionaries gehören zu den Mutable Types, was bedeutet, dass sie nach der Erstellung verändert werden können.'
    },
    {
      date: '30.09.2022',
      username: 'pythonlover123',
      voteId: 5,
      text: 'Wenn du sicherstellen möchtest, dass dein Dictionary unverändert bleibt, könntest du auch in Erwägung ziehen, es als frozenset zu definieren. Das macht es unveränderlich, könnte aber je nach Anwendungsfall passen.'
    },
    {
      date: '10.10.1337',
      username: 'L0r3m D010r',
      voteId: 5,
      text: 'L0r3m 1psUm d010r 517 4m37, c0ns3c7e7ur 4d1p15c1n9 31i7, s3d d01u5 n0n 3x3r c1t471n9 m0ll15t 4n1m 1d 3s7 14b0r3 37 d0l0r3 m4gn4 4l1qu4. U7 3n1m 4d m1n1m v3n14m, qu15 n05t3r 3x3rc174710n3m ul14m c0r80rum. D0l0r3 31u5m0d 7h3c0n5ec73tur, 4d1p15c1n9 31i7 4l1qu4 71n1d1un7 pr05p13n7 1n v0lup74r3 m0ll15t1 3s7, 3mbr4c1n9 4l1qu1d 3x 3a.L0r3m 1psUm d010r 517 4m37, c0ns3c7e7ur 4d1p15c1n9 31i7, s3d d01u5 n0n 3x3r c1t471n9 m0ll15t 4n1m 1d 3s7 14b0r3 37 d0l0r3 m4gn4 4l1qu4. U7 3n1m 4d m1n1m v3n14m, qu15 n05t3r 3x3rc174710n3m ul14m c0r80rum. D0l0r3 31u5m0d 7h3c0n5ec73tur, 4d1p15c1n9 31i7 4l1qu4 71n1d1un7 pr05p13n7 1n v0lup74r3 m0ll15t1 3s7, 3mbr4c1n9 4l1qu1d 3x 3a.L0r3m 1psUm d010r 517 4m37, c0ns3c7e7ur 4d1p15c1n9 31i7, s3d d01u5 n0n 3x3r c1t471n9 m0ll15t 4n1m 1d 3s7 14b0r3 37 d0l0r3 m4gn4 4l1qu4. U7 3n1m 4d m1n1m v3n14m, qu15 n05t3r 3x3rc174710n3m ul14m c0r80rum. D0l0r3 31u5m0d 7h3c0n5ec73tur, 4d1p15c1n9 31i7 4l1qu4 71n1d1un7 pr05p13n7 1n v0lup74r3 m0ll15t1 3s7, 3mbr4c1n9 4l1qu1d 3x 3a.'
    }
  ]

}
