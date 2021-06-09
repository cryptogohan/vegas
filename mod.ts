// @deno-types="./seedrandom.d.ts"
import seedrandom from "https://jspm.dev/seedrandom";
import { range } from "https://deno.land/x/it_range@v1.0.2/mod.ts";

/* Types for our generators */
type RandomInt = (min: number, max: number) => number;
type RandomPick = <A>(list: A[]) => A;
type RandomBelow = (exclusiveUpperBound: number) => number;
type RandomFloat = () => number;
type RandomSample = <A>(list: A[], sampleSize: number) => A[];

type RandomGenerators = {
  randomInt: RandomInt;
  randomPick: RandomPick;
  randomBelow: RandomBelow;
  randomFloat: RandomFloat;
  randomSample: RandomSample;
};

/* Implementations for random generator functions */

const randomInt_ = (
  genFloat: () => number,
  min: number,
  max: number,
): number => {
  if (
    min !== parseInt(String(min), 10) || max !== parseInt(String(max), 10)
  ) {
    throw new Error("min and max should be integers");
  }

  //The maximum is exclusive and the minimum is inclusive
  return Math.floor(genFloat() * (max - min)) + min;
};

const randomPick_ = <A>(genFloat: () => number, list: A[]): A => {
  const randomIndex = randomInt_(genFloat, 0, list.length);
  return list[randomIndex];
};

const randomBelow_ = (
  genFloat: () => number,
  exclusiveUpperBound: number,
): number => randomInt_(genFloat, 0, exclusiveUpperBound);

const randomFloat_ = (genFloat: () => number): number => genFloat();

const randomSample_ = <A>(
  genFloat: () => number,
  population: A[],
  sampleSize: number,
): A[] => {
  // We have two methods for collecting a random sample. The default picks a
  // random index and checks that it hasn't been picked already. If it has, it
  // tries again. For samples where the sample size is large relative to the
  // list size, picking from a pool ensures we never pick the same random
  // element twice, will be more efficient. This number is quite arbitrary at
  // the moment. In Python `popSize <= 21 + 4 ** ceil(log(sampleSize * 3, 4))`
  // is used. A PR for a smart way of picking this number is welcome.
  if (population.length <= 21 + (sampleSize * 3)) {
    const sampled = [];
    const source = [...population];
    for (const i of range(sampleSize)) {
      // We continously pick from a smaller set of the population. Decreasing
      // the right bound.
      const randomIndex = randomBelow_(genFloat, population.length - i);
      // Pick a random element from our source list
      sampled[i] = source[randomIndex];
      // Replace the element we just picked with the element that wasn't but will be out-of-bounds next iteration.
      // The magic of this method happens here. Each iteration we replace the
      // element we just picked from our source pool, with the right-most
      // element. Next iteration we move our right-bound left by one, thus not
      // reconsidering picked elements. To create a complete sample we have to
      // walk the source list at most once.
      // When picking the right most element, we can skip this line, but it
      // effectively does nothing anyway.
      source[randomIndex] = source[population.length - i - 1];
    }

    return sampled;
  }

  const sampled = [];
  const selected = new Set();
  for (const _ of range(sampleSize)) {
    let randomIndex = randomBelow_(genFloat, population.length);

    while (selected.has(randomIndex)) {
      randomIndex = randomBelow_(genFloat, population.length);
    }
    selected.add(randomIndex);
    sampled.push(population[randomIndex]);
  }
  return [];
};

/* Simplified random generators */
export const randomInt: RandomInt = (min, max) =>
  randomInt_(Math.random, min, max);

/**
 * Returns a random element from a list
 */
export const randomPick: RandomPick = (list) => randomPick_(Math.random, list);

/**
 * Returns an integer below the given bound and above but including 0.
 */
export const randomBelow: RandomBelow = (exclusiveUpperBound) =>
  randomBelow_(Math.random, exclusiveUpperBound);

/**
 * Returns a random number between 0 (inclusive) and 1 (exclusive).
 */
export const randomFloat: RandomFloat = () => randomFloat_(Math.random);

/**
 * Returns a set of unique elements chosen from the provided list.
 * @param {number} the size of the resulting list
 */
export const randomSample: RandomSample = (list, sampleSize) =>
  randomSample_(Math.random, list, sampleSize);

/* Exports for seeded scenarios */

/**
 * Returns generators based on a provided random number generator function.
 */
export const makeGenerators = (
  genFloat: () => number = Math.random,
): RandomGenerators => ({
  randomInt: (min: number, max: number) => randomInt_(genFloat, min, max),
  randomPick: <A>(list: A[]): A => randomPick_(genFloat, list),
  randomBelow: (exclusiveUpperBound: number) =>
    randomBelow_(genFloat, exclusiveUpperBound),
  randomFloat: () => randomFloat_(genFloat),
  randomSample: <A>(list: A[], sampleSize: number) =>
    randomSample_(genFloat, list, sampleSize),
});

/**
 * Returns generators based on a provided seed.
 */
export const makeSeededGenerators = (seed: string): RandomGenerators =>
  makeGenerators(seedrandom(String(seed)));
