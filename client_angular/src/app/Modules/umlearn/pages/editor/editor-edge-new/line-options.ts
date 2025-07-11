import { EditorElement } from '@DTOs/index';
import type { PlugOptions } from './plugs';
import { availablePlugs } from './plugs';
import type { Side, TextLabel } from '@DTOs/index'; // Changed from @Interfaces

export interface lineOptions {
  lineType?: 'direct' | 'manhattan'; // default: manhattan, currently only straight and manhattan is supported
  startDirection?: Side;
  startDirectionOffset?: number;
  endDirection?: Side;
  endDirectionOffset?: number;
  draggableStart?: boolean;
  draggableEnd?: boolean;
  size?: number;
  lineColor?: string;
  dash?: { len: number; gap: number };

  startLabel?: TextLabel;
  middleLabel?: TextLabel;
  endLabel?: TextLabel;
  startPlug?: PlugOptions;
  endPlug?: PlugOptions;
}

export const umlLineOptions: { [key: string]: { normal: lineOptions; highlight?: lineOptions } } = {
  [EditorElement.CD_GENERALISATION]: {
    //      ________|>
    normal: {
      size: 5,
      lineColor: 'black',
      dash: undefined,
      startPlug: undefined,
      endPlug: {
        plug: availablePlugs.TRIANGLE,
        color: 'white',
        scale: 1.7,
        outline: 0.5,
        outlineColor: 'black',
      },
    },
  },
  [EditorElement.CD_IMPLEMENTATION]: {
    //      --------|>
    normal: {
      size: 5,
      lineColor: 'black',
      dash: { len: 8, gap: 9 },
      startPlug: undefined,
      endPlug: {
        plug: availablePlugs.TRIANGLE,
        color: 'white',
        scale: 1.7,
        outline: 0.5,
        outlineColor: 'black',
      },
    },
  },
  //TODO edgeType.containment               //      ________(x)
  //TODO edgeType.informationFlow           //      -------->    <<flow>>
  [EditorElement.CD_DEPENDENCY]: {
    //      -------->
    normal: {
      size: 5,
      lineColor: 'black',
      dash: { len: 8, gap: 9 },
      startPlug: undefined,
      endPlug: {
        plug: availablePlugs.ARROW1,
        color: 'black',
        scale: 1.5,
      },
    },
  },
  //TODO edgeType.abstraction               //      -------->    <<abstraction>>
  //TODO edgeType.substitution              //      -------->    <<substitute>>
  //TODO edgeType.usage                     //      -------->    <<use>>
  [EditorElement.CD_ASSOCIATION]: {
    //      ________
    normal: {
      size: 5,
      lineColor: 'black',
      dash: undefined,
      startPlug: undefined,
      endPlug: undefined,
    },
  },

  [EditorElement.CD_DIRECTIONAL_ASSOCIATION]: {
    //      ________>
    normal: {
      size: 5,
      lineColor: 'black',
      dash: undefined,
      startPlug: undefined,
      endPlug: {
        plug: availablePlugs.ARROW1,
        color: 'black',
        scale: 1.5,
      },
    },
  },

  [EditorElement.CD_BIDIRECTIONAL_ASSOCIATION]: {
    //     <________>
    normal: {
      size: 5,
      lineColor: 'black',
      dash: undefined,
      startPlug: {
        plug: availablePlugs.ARROW1,
        color: 'black',
        scale: 1.5,
      },
      endPlug: {
        plug: availablePlugs.ARROW1,
        color: 'black',
        scale: 1.5,
      },
    },
  },

  [EditorElement.CD_AGGREGATION]: {
    //      ________<  >
    normal: {
      size: 5,
      lineColor: 'black',
      dash: undefined,
      startPlug: undefined,
      endPlug: {
        plug: availablePlugs.DIAMOND,
        color: 'white',
        scale: 1.5,
        outline: 0.6,
        outlineColor: 'black',
      },
    },
  },
  [EditorElement.CD_COMPOSITION]: {
    //      ________<<>>
    normal: {
      size: 5,
      lineColor: 'black',
      dash: undefined,
      startPlug: undefined,
      endPlug: {
        plug: availablePlugs.DIAMOND,
        color: 'black',
        scale: 1.5,
      },
    },
  },
};
