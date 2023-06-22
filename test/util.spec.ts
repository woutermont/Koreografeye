import * as N3 from 'n3';
import { 
  extractGraph,
  groundStore,
  parseStringAsN3Store, 
  storeAddPredicate, 
  storeGetPredicate, 
  topGraphIds
} from "../src/util";
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import { assert } from "chai";

const myEngine = new QueryEngine();

describe("parseStringAsN3Store", () => {
  it("parse an {<a> <b> <c>}", async () => {
    const store = await testStore(`<a> <b> <c> .`);
    assert.isNotNull(store);
  });
  it("parse an {<a> <b> <c>} to a store with length 1", async () => {
    const store = await testStore(`<a> <b> <c> .`);
    assert.equal(store.size,1);
  });
});

describe("topGraphIds", () => {
  it("find [a] as topGraphId of {<a> <b> <c>}", async () => {
    const store = await testStore(`<a> <b> <c> .`);
    const tops  = topGraphIds(store);
    assert.deepEqual(tops,['a']);
  });

  it("find [a] as topGraphId of {<a> <b> <c> ; <d> <e>}", async () => {
    const store = await testStore(`<a> <b> <c> ; <d> <e> .`);
    const tops  = topGraphIds(store);
    assert.deepEqual(tops,['a']);
  });

  it("find [a,x] as topGraphId of {<a> <b> <c> ; <d> <e>. <x> <y> <z>}", async () => {
    const store = await testStore(`<a> <b> <c> ; <d> <e> . <x> <y> <z>.`);
    const tops  = topGraphIds(store);
    assert.deepEqual(tops,['a','x']);
  });
});

describe("storeGetPredicate", () => {
  it("get <c> from { <a> <b> <c>", async () => {
    const store  = await testStore(`<a> <b> <c>.`);
    const result = storeGetPredicate(store,'b');
    assert.equal(result?.value,'c');
  });
});

describe("storeAddPredicate", () => {
  it("adds a <y> <z> to { <a> <b> <c> }", async () => {
    const store  = await testStore(`<a> <b> <c>.`);
    storeAddPredicate(store,'urn:test:y','urn:test:z');
    assert.isTrue(await storeContains(store,'ASK { ?x <urn:test:y> <urn:test:z> .}'));
  });
});

describe("groundStore", () => {
  it("creates size 1 ground for { <a> <b> <c> }", async () => {
    const store1 = await testStore(`<a> <b> <c>.`);
    const store2 = groundStore(store1);
    assert.equal(store2.size,1);
  });

  it("creates size 1 ground for { <a> <b> _:x }", async () => {
    const store1 = await testStore(`<a> <b> _:x.`);
    const store2 = groundStore(store1);
    assert.equal(store2.size,1);
  });

  it("creates grounded { <a> <b> <c> }", async () => {
    const store1 = await testStore(`<a> <b> <c>.`);
    const store2 = groundStore(store1);
    assert.isTrue(isGround(store2));
  });

  it("creates grounded { <a> <b> _:x }", async () => {
    const store1 = await testStore(`<a> <b> _:x.`);
    const store2 = groundStore(store1);
    assert.isTrue(isGround(store2));
  });
});

describe("extractGraph", () => {
  it("extract {<x> <y> <z>} from {<a> <b> <c> ; <d> <e>. <x> <y> <z>}", async () => {
    const store1 = await testStore(`<a> <b> <c> ; <d> <e> . <x> <y> <z>.`);
    const nn     = makeNode('x');
    const store2 = extractGraph(store1,nn);
    const store3 = await testStore(`<x> <y> <z>.`);

    assert.deepEqual(store2,store3);
  });
});

async function testStore(n3:string) {
  return await parseStringAsN3Store(n3, { format: 'text/n3'});
}

function makeNode(id: string) {
  if (id.startsWith('_:')) {
    return N3.DataFactory.blankNode(id.replace(/^_:/,''));
  }
  else {
    return N3.DataFactory.namedNode(id);
  }
}

function isGround(store: N3.Store) {
  let result = true;
  store.forEach( (quad) => {
    if (quad.subject.termType === 'NamedNode' &&
        quad.predicate.termType === 'NamedNode' &&
        quad.object.termType === 'NamedNode') {
        // console.log(quad);
    }
    else {
      result = false;
    }
  }, null, null, null, null);
  return result;
}

async function storeContains(store: N3.Store, sparql: string) {
  const answer = await myEngine.queryBoolean(sparql, {
    sources: [store]
  });
  return answer;
}