import { ClassAttribute, ClassNode, dataType, EditorElement, visibilityType } from '@DTOs/index';
import { SimilarityCompareService } from './similarity-compare.service';

describe('SimilarityCompareService', () => {
  let service: SimilarityCompareService;

  beforeEach(() => {
    service = new SimilarityCompareService();
  });

  it('should match attributes correctly', () => {
    const attemptAttributes: ClassAttribute[] = [
      { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
      { name: 'attr2', dataType: dataType.number, visibility: visibilityType.private }
    ];

    const solutionAttributes: ClassAttribute[] = [
      { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
      { name: 'attr4', dataType: dataType.number, visibility: visibilityType.private },
      { name: 'attr3', dataType: dataType.number, visibility: visibilityType.private }
    ];

    const result = service.getAttributesMatching(attemptAttributes, solutionAttributes);

    expect(result).toEqual([
      { attempt: attemptAttributes[0], solution: solutionAttributes[0], similarity: 1 },
      { attempt: attemptAttributes[1], solution: solutionAttributes[1], similarity: 0.9592 },
      { attempt: null, solution: solutionAttributes[2], similarity: 0 }
    ]);
  });

  it('should give a correct attributes similarity', () => {
    const attemptAttributes: ClassAttribute[] = [
    ];

    const solutionAttributes: ClassAttribute[] = [
      { name: 'attr1', dataType: dataType.string, visibility: visibilityType.public },
      { name: 'attr4', dataType: dataType.number, visibility: visibilityType.private },
      { name: 'attr3', dataType: dataType.number, visibility: visibilityType.private }
    ];

    const result = service.getAttributesSimilarity(attemptAttributes, solutionAttributes);

    expect(result).toEqual(0);
  });

  it('should give a correct node similarity', () => {
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

    const result = service.getNodeSimilarity(attemptElement, solutionElement);

    expect(result).toBeCloseTo(0.4995, 4);

  });


  // Weitere Testfälle können hier hinzugefügt werden
});
