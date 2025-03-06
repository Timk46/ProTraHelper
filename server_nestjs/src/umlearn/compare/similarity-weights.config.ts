export const nodeWeights = {
  total: 0.6,
  type: 0.2,
  title: 0.4,
  attributes: {
    total: 0.2,
    name: 0.6,
    dataType: 0.25,
    visibility: 0.15,
  },
  methods: {
    total: 0.2,
    name: 0.6,
    dataType: 0.25,
    visibility: 0.15,
  }
};

export const edgeWeights = {
  total: 0.4,
  type: 0.2,
  start: 0.15,
  end: 0.15,
  cardinalityStart: 0.1,
  description: 0.3,
  cardinalityEnd: 0.1,
}

