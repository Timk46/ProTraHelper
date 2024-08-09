import { ClassAttribute, ClassNode, dataType, editorDataDTO, EditorElement, visibilityType } from '@DTOs/index';
import { SimilarityCompareService } from './similarity-compare.service';

describe('SimilarityCompareService', () => {
  let service: SimilarityCompareService;

  beforeEach(() => {
    service = new SimilarityCompareService();
  });

  /* it('should match attributes correctly', () => {
    const attemptAttributes: ClassAttribute[] = [
      { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
      { name: 'attr2', dataType: dataType.number, visibility: visibilityType.private }
    ];

    const solutionAttributes: ClassAttribute[] = [
      { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
      { name: 'attr4', dataType: dataType.number, visibility: visibilityType.private },
      { name: 'attr3', dataType: dataType.number, visibility: visibilityType.private }
    ];

    const result = service.findElementMatching(attemptAttributes, solutionAttributes, service.calcSingleAttributeSimilarity);

    expect(result).toEqual([
      { attempt: attemptAttributes[0], solution: solutionAttributes[0], similarity: 1 },
      { attempt: attemptAttributes[1], solution: solutionAttributes[1], similarity: 0.9592 },
      { attempt: null, solution: solutionAttributes[2], similarity: 0 }
    ]);
  }); */

  /* it('should give a correct attributes similarity', () => {
    const attemptAttributes: ClassAttribute[] = [
    ];

    const solutionAttributes: ClassAttribute[] = [
      { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
      { name: 'attr4', dataType: dataType.number, visibility: visibilityType.private },
      { name: 'attr3', dataType: dataType.number, visibility: visibilityType.private }
    ];

    const result = service.calcAttributesSimilarity(attemptAttributes, solutionAttributes);

    expect(result).toEqual(0);
  }); */

  /* it('should give a correct node similarity', () => {
    const attemptElement: ClassNode = {
      title: 'Class1',
      type: EditorElement.CD_CLASS,
      attributes: [
        { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
        { name: 'attr2', dataType: dataType.number, visibility: visibilityType.private }
      ],
      methods: [
        { name: 'method1', dataType: dataType.string, visibility: visibilityType.public },
        { name: 'method2', dataType: dataType.number, visibility: visibilityType.private }
      ],
      id: '1',
      position: { x: 1, y: 1 },
      width: 1,
      height: 1
    };

    const solutionElement: ClassNode = {
      title: 'Heisenberg',
      type: EditorElement.CD_INTERFACE,
      attributes: [
        { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
        { name: 'attr4', dataType: dataType.number, visibility: visibilityType.private },
        { name: 'attr3', dataType: dataType.number, visibility: visibilityType.private }
      ],
      methods: [
        { name: 'method1', dataType: dataType.string, visibility: visibilityType.public },
        { name: 'method2', dataType: dataType.number, visibility: visibilityType.private }
      ],
      id: '2',
      position: { x: 1, y: 1 },
      width: 1,
      height: 1
    };

    const result = service.calcSingleNodeSimilarity(attemptElement, solutionElement);

    expect(result).toBeCloseTo(0.4995, 4);

  }); */

  it ('should give a correct graph similarity log', () => {
    const attemptGraph: editorDataDTO = {
      nodes: [
        {
          title: 'Class1',
          type: EditorElement.CD_CLASS,
          attributes: [
            { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
            { name: 'attr2', dataType: dataType.number, visibility: visibilityType.private }
          ],
          methods: [
            { name: 'FALSCHmethod1', dataType: dataType.string, visibility: visibilityType.public },
            { name: 'method2', dataType: dataType.number, visibility: visibilityType.private }
          ],
          id: '1',
          position: { x: 1, y: 1 },
          width: 1,
          height: 1
        },
        {
          title: 'Class2',
          type: EditorElement.CD_CLASS,
          attributes: [
            { name: 'attr11', dataType: dataType.string, visibility: visibilityType.public },
            { name: 'attr12', dataType: dataType.string, visibility: visibilityType.private }
          ],
          methods: [
            { name: 'method11', dataType: dataType.string, visibility: visibilityType.public },
            { name: 'method12', dataType: dataType.number, visibility: visibilityType.private }
          ],
          id: '2',
          position: { x: 1, y: 1 },
          width: 1,
          height: 1
        }
      ],
      edges: [
        {
          id: '11',
          type: EditorElement.CD_ASSOCIATION,
          start: '1',
          end: '2',
          cardinalityStart: '2',
          cardinalityEnd: '1',
          description: 'Description'
        },
        {
          id: '12',
          type: EditorElement.CD_ASSOCIATION,
          start: '1',
          end: '2',
          cardinalityStart: '1',
          cardinalityEnd: '1',
          description: 'Added Edge'
        }

      ]
    };

    const solutionGraph: editorDataDTO = {
      nodes: [
        {
          title: 'Class1',
          type: EditorElement.CD_CLASS,
          attributes: [
            { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
            { name: 'attr2', dataType: dataType.number, visibility: visibilityType.private }
          ],
          methods: [
            { name: 'method1', dataType: dataType.string, visibility: visibilityType.public },
            { name: 'method2', dataType: dataType.number, visibility: visibilityType.private }
          ],
          id: '1',
          position: { x: 1, y: 1 },
          width: 1,
          height: 1
        },
        {
          title: 'Class2',
          type: EditorElement.CD_CLASS,
          attributes: [
            { name: 'attr11', dataType: dataType.string, visibility: visibilityType.public },
            { name: 'attr12', dataType: dataType.number, visibility: visibilityType.private }
          ],
          methods: [
            { name: 'method11', dataType: dataType.string, visibility: visibilityType.public },
            { name: 'method12', dataType: dataType.number, visibility: visibilityType.private }
          ],
          id: '2',
          position: { x: 1, y: 1 },
          width: 1,
          height: 1
        }
      ],
      edges: [
        {
          id: '11',
          type: EditorElement.CD_ASSOCIATION,
          start: '1',
          end: '2',
          cardinalityStart: '1',
          cardinalityEnd: '1',
          description: 'Description'
        }
      ]
    };

    const graphMatching = service.findGraphMatching(attemptGraph, solutionGraph);
    const result = service.generateGraphSimilarityLog(graphMatching);
    console.log("##########################", result);

    expect(result).toEqual("");
  });


  // Weitere Testfälle können hier hinzugefügt werden
});
