# svelte5-reactivity

---
**Source:** ref/the-svelte-5-reactivity-guide
**Generated:** 2026-01-07 19:59:44
**Modules:** 15
**Files Processed:** 15
**Enriched:** Yes (Web Research)
---


## Executive Summary

[Summary content from LLM]

## Modules

1. [01 The Svelte 5 Reactivity Guide](#01-the-svelte-5-reactivity-guide)
2. [02 Learn How To Derive Values In Svelte 5 Without Side Effects](#02-learn-how-to-derive-values-in-svelte-5-without-side-effects)
3. [03 Understanding Effects In Svelte 5 And When To Use Them](#03-understanding-effects-in-svelte-5-and-when-to-use-them)
4. [04 Using Svelte Stores With Svelte 5 Runes To Create Runed Stores](#04-using-svelte-stores-with-svelte-5-runes-to-create-runed-stores)
5. [08 Different Ways To Share State In Svelte 5](#08-different-ways-to-share-state-in-svelte-5)
6. [09 Avoid Async Effects In Svelte](#09-avoid-async-effects-in-svelte)
7. [10 Master The Svelte Context Api](#10-master-the-svelte-context-api)
8. [11 How Svelte Reactivity Works](#11-how-svelte-reactivity-works)
9. [12 Avoid Leaking User Data In Your Sveltekit App](#12-avoid-leaking-user-data-in-your-sveltekit-app)
10. [13 Everything You Should Know About Working With Forms In Sveltekit](#13-everything-you-should-know-about-working-with-forms-in-sveltekit)
11. [14 Full Stack Sveltekit Crud App Using Remote Functions Tutorial](#14-full-stack-sveltekit-crud-app-using-remote-functions-tutorial)
12. [15 Google Analytics With Sveltekit](#15-google-analytics-with-sveltekit)
13. [16 Learn Sveltekit Hooks Through 6 Examples](#16-learn-sveltekit-hooks-through-6-examples)
14. [17 Using Websockets With Sveltekit](#17-using-websockets-with-sveltekit)
15. [18 What'S New In Sveltekit 2 Shallow Routing](#18-what's-new-in-sveltekit-2-shallow-routing)

## 01 The Svelte 5 Reactivity Guide

Svelte is a language that takes your component code and turns it into efficient JavaScript code. In 2019, Svelte challenged what reactivity could be in a JavaScript framework by moving the reactivity from the component API into the language itself. Svelte 5 moves reactivity out of the component API and into the language.

## Svelte 5 Introduces Runes

Svelte 5 introduces a new reactive system: **runes**. Runes are a universal fine-grained reactive system, reducing complexity and making Svelte smaller, faster, and more consistent.

A rune is a letter or mark used as a mystical or magic symbol.

### State in Svelte 5

Here I have a simple count. In Svelte 5, to declare a piece of reactive state you have to use the `$state` rune:

```javascript
let count = $state(0);
```

Next, we can create a derived value using the `$derived` rune:

```javascript
let double = $derived(count * 2);
```

Now this code is going to work the same as before, and the output is more predictable because Svelte uses signals under the hood.

Now we can see that count and double are in sync, and everything works a lot more predictably.

## Side Effects

Side effects are where you can run your code where you can talk to things outside of your component, such as the browser API, fetch, or manipulating the DOM.

In this example, we can use the `$effect` rune:

```javascript
$effect(() => {
  console.log(count);
});
```

Inside of here where we say `console.log(count)`, Svelte is going to see that count is a dependency of the effect and is going to rerun each time count updates. As you can see, there are no dependency arrays because Svelte uses signals under the hood - everything works automatically.

Effects are also a place where you can run your code when the component mounts. You should rarely reach for effects unless you're doing one of those things.

### Effect Cleanup

Let's look at another example. Here I have some count state and milliseconds:

```javascript
let count = $state(0);
let milliseconds = $state(1000);

$effect(() => {
  const interval = setInterval(() => {
    count += 1;
  }, milliseconds);

  return () => clearInterval(interval);
});
```

Effects rerun whenever their dependencies change. We can see that we have count and milliseconds here which are going to be treated as a dependency of this effect.

We can also optionally provide a callback which is going to rerun each time before the effect updates and when the component unmounts. In this example, we just have a simple interval which you're going to make slower or faster.

### Don't Use Effects to Derive State

One thing that you shouldn't do with effects is using them to derive state or synchronize state. That is why you're rarely going to reach for effects, because there's simply no reason to since you have the `$state` rune and the `$derived` rune.

In this example, I have a count and double, and you might be tempted to do something like this, but **don't do it**:

```javascript
let count = $state(0);
let double = $state(0);

$effect(() => {
  double = count * 2; // DON'T DO THIS
});
```

Now inside of increment, you're going to actually run into the same problem that we've seen before: count and double are going to be out of sync because effects always run before the next DOM update.

You shouldn't use effects to derive values. You should instead use the `$derived` rune:

```javascript
let double = $derived(count * 2);
```

## Runes Are Compiler Instructions

Runes are just function-like symbols that provide instructions to the Svelte compiler. You might be tempted to think that these runes are functions, but they're just instructions to the Svelte compiler. As you can see, there are no imports.

Another benefit is that they're easy to type because they look like functions. When it comes to your tooling, this might just as well be regular functions.

### Compiled Output

We can look at the compiled output, which is surprisingly simple to read. Let's look at the state rune which gets converted into a signal:

```javascript
import { source } from 'svelte/internal';
const count = source(0);
```

You can also see that the derived rune gets turned into a derived signal - this is just another signal that has count as a dependency.

We can also see that Svelte differentiates between user effects and template effects. User effects are the effects that we defined ourselves. Template effects are from the template in the Svelte component - it uses a special function to set text.

This is a huge reason why Svelte 5 is smaller, faster, and more efficient.

## Universal Reactivity

Universal reactivity means that you can use the same logic inside and outside Svelte components.

Here I have a simple count example. Like before, we can encapsulate this logic inside of a `createCounter` function and then return the count. But there is going to be one problem: Svelte doesn't change how JavaScript works.

If we try to use count inside of this component:

```javascript
let counter = createCounter();
console.log(counter.count); // 0
increment();
console.log(counter.count); // still 0 - not reactive!
```

When we log `counter.count`, we're going to see it's zero as expected. But when we increment the value of count, we're going to see the next time is zero. That's because that's just how JavaScript works. Reactivity in this case can't magically cross the function boundary.

### Using Getters and Setters

What we actually can do is use a getter and setter:

```javascript
function createCounter() {
  let count = $state(0);

  return {
    get count() {
      return count;
    },
    set count(value) {
      count = value;
    },
    increment() {
      count += 1;
    }
  };
}
```

Now when we define the counter again and we say `counter.count`, it's going to be zero. We're going to increment the count, and then when we say `counter.count` again, it's going to be one.

We can actually refactor this function into a separate file - this can be a `.svelte.js` or `.svelte.ts` file. Now when we have this here, we can just import the `createCounter` from `counter.svelte.js` or `.ts` if you're using TypeScript, and you can see it works beautifully.

Now we can say `counter.count += 1` to increment it, and it's going to update where we have `counter.count`, thanks to the magic of signals.

## Deeply Nested Reactivity

Inside the `$state` rune, Svelte wraps objects and arrays with proxies which intercept reads and writes of objects and array properties and turns them into signals.

If you remember this example from before, here we define a count by saying `count = $state(0)`, and then we have to define a getter and setter. Now when we say `counter.count += 1`, we're going to invoke the setter and update the count value, which is going to reactively update in our template.

### Simpler Approach with Objects

What I haven't told you is you can write this in a simpler way. Instead of having to define a getter and setter, you can use deeply nested reactivity by using an object:

```javascript
let counter = $state({ count: 0 });
```

This uses a proxy under the hood, so you don't have to specify a getter and setter yourself. Now everything works the same as before.

### Why This Matters

Why is this actually important? Let's look at how you would write code if you didn't have deeply nested reactivity. In this case, I have a simple to-do example where I have this to-do array:

```javascript
// Without deeply nested reactivity
let todos = $state([]);

function addTodo(done, text) {
  // Would need getter/setter for each field
  let doneSig = $state(done);
  let textSig = $state(text);
  // ...lots of boilerplate
}
```

This is a lot of boilerplate.

With deeply nested reactivity in Svelte 5, since we define an array, it's already deeply reactive:

```javascript
let todos = $state([]);

function addTodo(done, text) {
  todos.push({ done, text });
}
```

Under the hood, `todos` is a proxy that still uses signals, and Svelte is going to turn the properties on the objects into signals.

Now you can simply bind the value of the to-do text and you can also easily bind if the to-do is done.

### Classes Are Cool Again

Another benefit of deeply nested reactivity is if you're storing your reactive value somewhere in local storage or a database. When you return them, you don't have to reunify them or do anything else - when you reassign them to state, they're going to be deeply reactive.

Alternatively, you can use a class because **Svelte makes classes cool again**:

```javascript
class Todo {
  done = $state(false);
  text = $state('');
}
```

If you have a class here, you can define a `done` and `text` fields, and Svelte is automatically going to turn them into getters and setters for you. This greatly improves the experience of using classes in Svelte 5.

## No More Reactive Assignments

Thanks to deeply nested reactivity, you don't need reactive assignments for objects and arrays.

Here I have some numbers, and then I'm going to calculate the total by using a derived rune:

```javascript
let numbers = $state([1, 2, 3]);
let total = $derived(numbers.reduce((sum, n) => sum + n, 0));
```

In the past, if you're using an older version of Svelte, you might remember something like this to update the value reactively:

```javascript
// OLD WAY - don't do this
numbers = [...numbers, numbers.length + 1];
```

We had to reassign it and then we would have to spread the value and then add the new value.

This is no longer the case in Svelte 5. Because of deeply nested reactivity, you can just straight up use array methods like push:

```javascript
numbers.push(numbers.length + 1);
```

This works as expected.

## Shared State Across Modules

Because of deeply nested reactivity, you can have shared state across modules:

```javascript
// preferences.svelte.js
export let preferences = $state({
  theme: 'dark'
});
```

Now when you update it, this is going to reflect in your components:

```javascript
{#if preferences.theme === 'light'}
  ☀️
{:else}
  🌙
{/if}
```

## Reactive Proxies

Svelte also provides proxy Map, Set, Date, and URL classes which have the same API as their non-reactive counterparts.

In this example, we can look at some reactive imports:

```javascript
import { URL } from 'svelte/reactivity';

let url = new URL('https://example.com/path');
```

Now we can bind these values to it, and this works as the regular API. When we update hostname, it's going to reactively update, and same with the pathname.

This is deeply nested reactive state in Svelte 5.

## Svelte 5 Is Not Like React

While there are some surface-level similarities with Svelte 5's API to React, Svelte 5 is nothing like React and is more inspired by its contemporary frameworks like Solid.js and Vue.

What's really important to understand in Svelte 5 are the reactivity patterns and that **runes are just reactive primitives**. You can use deeply nested reactivity or a class to avoid boilerplate, but runes are just reactive primitives which can be used to make a reactivity system.

### Creating Custom Reactive Primitives

Maybe you're a fan of Solid, so we can create this `useSignal` function:

```javascript
function useSignal(initialValue) {
  let value = $state(initialValue);

  const read = () => value;
  const write = (newValue) => value = newValue;

  return [read, write];
}

// Usage
let [count, setCount] = useSignal(0);
```

Maybe you're a fan of Vue, so you can create this `ref` function:

```javascript
function ref(initialValue) {
  let value = $state(initialValue);

  return {
    get value() { return value; },
    set value(newValue) { value = newValue; }
  };
}

// Usage
let count = ref(0);
count.value += 1;
```

Of course, this is completely up to you what you want to use, but it's really important to understand what runes are. Runes aren't some marketing gimmick in an attempt to rebrand signals. As you've seen, runes are just function-like symbols that give instructions to the Svelte compiler, which then get turned into signals under the hood.

## Props

In this example, I want to create a simple reusable `Button.svelte` component. The first thing I want to do is get children, which I can do using the `$props` rune:

```svelte
<script>
  let { children, class: className, ...rest } = $props();
</script>

<button class={className} {...rest}>
  {@render children()}
</button>
```

I can destructure `children` from the props object and render them to the DOM. Another prop I want to include is `class`, but `class` is a reserved keyword in JavaScript, so we can just rename it. Lastly, let's also spread the other props we want to include.

Now inside of our component, we can import button:

```svelte
<script>
  import Button from './Button.svelte';
  let count = $state(0);
</script>

<Button onclick={() => count += 1}>
  {count}
</Button>
```

Notice another thing in Svelte 5: event listeners are just regular properties, which means that you can pass them easily and even spread them.

### Props Are Read-Only by Default

Props are read-only by default, though, unless you're explicit and make them bindable. Since state is deeply reactive, this just means that you can change some state upwards in your parent from a child by accident.

Let's look at an example. Here I'm importing this Mouse component, and then I'm going to set the coordinates:

```svelte
<script>
  let coords = $state({ x: 0, y: 0 });
</script>

<Mouse {coords} />
```

Inside the Mouse component, we can just pass the coordinates as a prop and then reassign the coordinates. As you can see, because state is deeply reactive, we can by accident change the state in the parent. That is why this is read-only by default.

### Making Props Bindable

What if you want to bind the value in the parent and change the coords itself? We can just make the coords bindable using the `$bindable` rune:

```svelte
<script>
  let { coords = $bindable() } = $props();
</script>
```

Now we can change the Mouse component and bind the value of coords:

```svelte
<Mouse bind:coords />
```

Now it's going to work, and now we're going to see the value is going to update in both components.

We can also set a default value for coordinates inside of `$bindable`:

```svelte
let { coords = $bindable({ x: 0, y: 0 }) } = $props();
```

You can pass whatever you want as a fallback value if you don't pass the prop.

### How Props Work Under the Hood

Under the hood, Svelte uses get/set methods for props. Components are functions. We have this Mouse function that accepts a node, and then we have this read-only property `get coords`, which is the default. Then Svelte can check: if this is writable, okay, then everything is fine. Otherwise, it's going to throw an error with a useful message informing you that you should make it bindable if you want.

Props are more simpler and more powerful than before.

## Inspecting State

Being able to debug values and see how and why they change is really important during development. We've seen in a previous example that we can use an effect to log the value of count when it updates, but this is verbose.

Instead of using an effect for this, you should use the `$inspect` rune:

```javascript
$inspect(count);
```

By default, once you pass it a signal, it's going to use console.log. Whenever this value updates, it's going to get logged.

### Custom Inspection

You're not only limited to console.log - you can provide your own custom callback:

```javascript
$inspect(count).with((type, value) => {
  if (type === 'update') {
    debugger;
    // or console.trace()
  }
});
```

This is going to accept a type, and you can also pass it the parameter (what you pass to inspect, in this example count). You can also check what type it is. In this case, if it's `type: update`, you can open the debugger or you can do a stack trace - that is completely up to you.

Another benefit of using the inspect rune in Svelte 5 is that **it only works in development**, so you're not going to accidentally ship it in production.

## Better Developer Experience

Svelte 5 not only enables a better developer experience for the average developer but also for library authors and maintainers. That is why we're already starting to see some awesome projects in the Svelte ecosystem.

For example, here we have this awesome project **Runes** which has a bunch of useful utility functions for Svelte 5. Here we can look at this `watch` utility which watches for changes and runs a callback.

We didn't talk about some more advanced aspects of effects because they're really not important for this video, but for example, Svelte provides an `untrack` function allowing you to specify that a dependency shouldn't be tracked. This `watch` utility basically you just pass a signal in, and then when that signal updates, it can run some callback for you.

This is all possible because Svelte 5 is smaller, faster, easier to use, and more capable than before.

## Conclusion

With runes, Svelte becomes a much simpler framework. You don't need to:

- Understand the special `let` behavior
- Understand the `$:` label
- Understand how `export` works
- Switch mental modes between Svelte and non-Svelte JavaScript
- Use stores or lifecycle functions (probably)

When people come to our community in the future, they're going to have a much easier time getting comfortable.

I think if anything, I'm more excited about what this means for people who are already maintaining Svelte codebases. We've spent a lot of time converting existing apps and libraries to see how it feels, and it really does feel good.

## Extracted Concepts

- **$state** — Reactive state primitive that creates a signal
- **$derived** — Computed/derived value that updates when dependencies change
- **$effect** — Side effect that runs when dependencies update
- **$props** — Declare component props with destructuring
- **$bindable** — Make props writable from parent components
- **$inspect** — Debug rune for logging reactive values (dev-only)
- **Runes** — Function-like compiler instructions that create signals
- **Universal reactivity** — Use same reactive primitives in `.svelte.js` files
- **Deeply nested reactivity** — Objects/arrays wrapped in proxies for automatic reactivity
- **Signals** — Under-the-hood primitive powering Svelte 5 reactivity

## 02 Learn How To Derive Values In Svelte 5 Without Side Effects

Svelte 5 introduces a new reactivity system called runes. You can declare a piece of state by saying `$state` and you can derive values using `$derived`.

## Understanding Signals

Let's get a higher level understanding of signals first. Create a button because right now this isn't even reactive. It only becomes reactive when we write to the signal. This is going to get created into a signal if we assign to the signal itself. We can also read the derived and this is the only time derives run - when you read from them.

### How Signals Work Under the Hood

Looking at the output, we can see Svelte declares `a` and then creates a signal from it (named Source, but the name isn't important). A signal is just a normal object with subscribers and some other things on it. Then it creates the derived which is also a signal but it's also a function. By default it takes a simple expression so you don't have to declare a function each time.

**The important part is reading the signal.** The template effect gets created because we used the signal or `b` in our template. This is a helper to set the text. When we read the signal, first the function is going to run and get added to the context. When we read the signal inside of it, we check: "Hey, if there's anything in the context, okay that's what's calling me. That's the function I'm going to add to my subscribers."

The same thing happens when we go back to the derived. We run this function, push it into the context, then when we read the signal inside of it we check: "Who is calling me? Is there anyone in the context? Ah okay, this function is in the context. I'm going to add it to my subscribers."

When we set the value using `onClick`, we pass in the signal and the set value. We always get the freshest value and then pass `+1` (or whatever we do to update the value). We pass a signal and update it, then notify all of the subscribers which are just this function. This runs all of the subscribers and that's basically how signals work.

### Deep Reactivity with Proxies

When you pass an object or array to `$state`, it gets turned into a proxy under the hood. This allows Svelte to trap those values and do whatever it wants. This enables amazing things that weren't possible in the past - for example, you can now just push things to an array directly instead of having to reassign like `a = [...a, newItem]`. In Svelte 5 you can just say `a.push(item)` and it just works because it uses proxies.

This also allows you to export from a `.svelte.ts` or `.js` file and it becomes global state. Without proxies, Svelte wouldn't know if this was just a regular variable or a signal.

## Using $derived.by

Remember how `$derived` always gets turned into a function? If you need to use a function for something more complicated, you can use `$derived.by`. These two examples are equivalent:

```javascript
let b = $derived(a * 2);
let b = $derived.by(() => a * 2);
```

You can return whatever you want:

```javascript
let b = $derived.by(() => ({
  double: a * 2,
  quadruple: a * 4
}));
```

Now you can access `b.double` and `b.quadruple` and these values are in sync.

## Avoiding Side Effects in Derives

`$derived` is really just a regular function. What are you always taught by functional programmers? You shouldn't do side effects. Don't do something outside of the function, don't use `Math.random()`, and this is what you should avoid doing when you're using derives.

The Svelte compiler is advanced enough to warn you. For example, if you try to modify a signal inside a derived:

```javascript
let b = $derived.by(() => {
  a = 10; // ERROR: State unsafe mutation
  return a;
});
```

You'll get: "State unsafe mutation - updating state inside a derived is forbidden."

However, you can get around this by returning a function with a getter, but **don't do this**. In derives you should just read values, don't write to values, don't write to external state. Maybe you're tempted to write to localStorage each time this updates, but no - don't do this. Just use `$derived` to derive values, read from them, don't write to things.

If you need side effects, use `$effect` outside:

```javascript
$effect(() => {
  console.log(a);
  // Write to localStorage here if needed
});
```

### Using untrack for Advanced Cases

There's `untrack` for advanced cases. This makes values non-reactive inside the callback:

```javascript
$effect(() => {
  if (b) {
    untrack(() => {
      // a isn't reactive here
      // prevents infinite loops
    });
  }
});
```

But there are better ways which we'll cover later.

## Problems with State Inside Derives

Another problem is keeping state inside a derived using closures:

```javascript
let b = $derived.by(() => {
  let count = 0; // closure state
  count++;
  return count;
});
```

When you use `b` in multiple places, you might run into issues. When you want to derive from `b`:

```javascript
let c = $derived(b * 2);
```

Now when this updates, you're running the logic and potentially modifying state from inside the derived. This gets you into trouble. **Always read values and never write to values when using derives.**

## Microtasks and Why Not to Use Effects for State Sync

Let me show you why using effects to sync values is a bad idea. You might try:

```javascript
let a = $state(0);
let b = $state(0);

$effect(() => {
  b = a * 2;
});

function increment() {
  a++;
  console.log(a, b); // State is out of sync!
}
```

Why is your state out of sync? **Effects always run last** when all of your logic is done. In JavaScript/the browser there's this concept of a microtask queue. You can queue things that you want to do last when you do all of your work. This is more efficient.

When your stack is empty, only then the microtask queue runs (which includes `queueMicrotask`). Only then your effect is going to run when it's too late. This is why you should never use effects to synchronize state.

Use `$derived` instead:

```javascript
let a = $state(0);
let b = $derived(a * 2);

function increment() {
  a++;
  console.log(a, b); // State is in sync!
}
```

This happens real-time. Once you update the value, you always have the freshest value, which is the advantage of signals compared to the previous version of Svelte.

**Never use effects to synchronize state - use derives instead.**

## When to Use $derived vs Regular Functions

You might have noticed we don't actually need `$derived` to derive values. You can pass a regular function:

```javascript
let b = () => a * 2;

// In template:
{b()} {b()} {b()} // Runs calculation 3 times
```

But this has a problem. When you update the value, you're doing the computation each time you invoke `b`. With `$derived`:

```javascript
let b = $derived(a * 2);

// In template:
{b} {b} {b} // Calculated once, cached
```

When we update the value, we only update it once and then the rest of the work Svelte has to do is just update this in the DOM. There is no computation going on. With the function example, we had to do the same calculation 7 times.

This isn't bad for simple things. You don't even need `$derived` - you can just say `a * 2` directly in the template. But when you have more complicated things like calculating a cart total, it makes sense to use `$derived`.

**Don't worry about performance penalties** - you can just use `$derived` for everything. However, for simple cases like array length:

```javascript
let items = $state([1, 2, 3, 4]);

// This is fine:
{items.length}

// This is overkill:
let remaining = $derived(items.length);
```

Just use `items.length` whenever this value updates. It's perfectly fine - you're just wasting space creating a derived for something so simple.

**Always use $derived if you can - there's no performance penalty.**

## Naive Implementation of Signals

Let's look at a basic signals implementation using regular JavaScript. This is how all JavaScript frameworks that implement signals work:

```javascript
// Signal (named Source after Svelte)
function createSignal(value) {
  return {
    value,
    subscriptions: []
  };
}

// Effect
let context = null;

function effect(fn) {
  context = fn;
  fn();
  context = null;
}

// Get (reads signal)
function get(signal) {
  if (context) {
    signal.subscriptions.push(context);
  }
  return signal.value;
}

// Set (updates signal)
function set(signal, newValue) {
  signal.value = newValue;
  signal.subscriptions.forEach(fn => fn());
}
```

**How it works:**

1. We run the effect first, setting the context to that function
2. Inside the function we read the signal
3. When reading the signal, we check: "Hey, if there's a current context, that's what's calling us, so we add this to subscriptions"
4. When we set the value, we run all subscriptions

**Derived implementation:**

```javascript
function derived(fn) {
  const signal = createSignal();
  effect(() => {
    set(signal, fn());
  });
  return signal;
}
```

A derived is just a signal wrapped in an effect. It reruns the function each time it updates its subscribers. That's basically how signals work.

## Writable Derives for Two-Way Binding

Derives are read-only, so you can't use them to bind values. From the Svelte docs example, this won't work:

```javascript
let spent = $derived(total - left); // Can't bind to $derived
let left = $derived(total - spent);
```

Error: "Cannot bind to derived state"

### Solution 1: Regular Functions

```javascript
function updateSpent(e) {
  spent = +e.target.value;
  left = total - spent;
}

function updateLeft(e) {
  left = +e.target.value;
  spent = total - left;
}

// In template:
<input value={spent} on:input={updateSpent} />
<input value={left} on:input={updateLeft} />
```

### Solution 2: Writable Derived with Getter/Setter

```javascript
let total = 100;
let spent = $state(0);
let left = {
  get value() {
    return total - spent;
  },
  set value(newValue) {
    spent = total - newValue;
  }
};

// In template (must use .value):
<input bind:value={left.value} />
```

Both approaches work - there's no right or wrong. **Just don't use effects.**

## Advanced Example: Temperature Converter

Here's something crazy - you can use getters/setters on the state object itself:

```javascript
class Temperature {
  #celsius = $state(0);
  #fahrenheit = $state(0);

  get celsius() {
    return this.#celsius;
  }

  set celsius(newValue) {
    this.#celsius = newValue;
    this.#fahrenheit = (newValue * 9) / 5 + 32;
  }

  get fahrenheit() {
    return this.#fahrenheit;
  }

  set fahrenheit(newValue) {
    this.#fahrenheit = newValue;
    this.#celsius = (newValue - 32) * 5 / 9;
  }
}

const temperature = new Temperature();

// In template:
<input type="number" bind:value={temperature.celsius} />
<input type="number" bind:value={temperature.fahrenheit} />
```

The values are now synchronized. This is something you would actually do for real.

## Keeping Things Simple: Coin Flip Example

Let's look at how you can easily overcomplicate things. Simple approach:

```javascript
let side = $state();
let history = $state([]);

function flip() {
  side = Math.random() < 0.5 ? 'heads' : 'tails';
  history.push(side);
}
```

**Avoid this temptation:**

```javascript
let history = $derived.by(() => {
  let history = [];
  history.push(side);
  return history;
});
```

**Problems with this approach:**

1. If you want to derive something from this, you run into trouble
2. **Derives are lazy** - they only update when their value updates. If `Math.random()` returns the same value multiple times in a row (heads, heads, heads), the derived won't run because the value didn't change
3. This makes signals awesome - they're not wasteful, only rerunning when the value actually changes

If you get into a situation like this, just do something simple - update everything inside the flip function.

### Using a Class

```javascript
class Coin {
  side = $state();
  history = $state([]);

  flip = () => {
    this.side = Math.random() < 0.5 ? 'heads' : 'tails';
    this.history.push(this.side);
  }
}

const coin = new Coin();

// In template:
<button on:click={coin.flip}>
  {coin.side || 'Flip'}
</button>

{#each coin.history as flip}
  {flip}
{/each}
```

Note: Use arrow function for `flip` to preserve `this` context, or use `on:click={() => coin.flip()}`.

**Decide if you actually need $derived.** For example, calculating percentages:

```javascript
class Coin {
  side = $state();
  heads = $state(0);
  tails = $state(0);

  flip = () => {
    this.side = Math.random() < 0.5 ? 'heads' : 'tails';
    if (this.side === 'heads') {
      this.heads++;
    } else {
      this.tails++;
    }
  }
}
```

You don't need complicated derives here - this is simple compared to using `$derived`. Ask yourself: do you actually need it?

## Key Takeaways

- **Read values, don't write** - Use `$derived` to derive values, not to perform side effects
- **Never use effects for state sync** - Effects run in microtasks after your logic completes
- **Use $derived for computed values** - No performance penalty, provides caching
- **Simple cases don't need $derived** - Direct expressions like `items.length` are fine
- **Writable derives** - Use getters/setters when you need two-way binding
- **Keep it simple** - Don't overcomplicate with derives when simple state updates work
- **Derives are lazy** - They only update when the derived value actually changes

## 03 Understanding Effects In Svelte 5 And When To Use Them

Svelte 5 introduces effects as part of its new reactivity system based on runes (signals under the hood). While effects are a core building block of signals, they should be used sparingly. This module explores what effects are, when to use them, and practical alternatives.

## Svelte 5 Reactivity Basics

Svelte 5 has a new reactivity system called runes. You can create reactive state with `$state`:

```svelte
let count = $state(0);

<button onclick={() => count++}>
  {count}
</button>
```

For derived values, use `$derived`:

```svelte
let double = $derived(count * 2);
```

## What Are Effects?

Effects are introduced with the `$effect` rune. Unlike React, Svelte doesn't re-render the entire component when you update a value. It uses signals under the hood to update only what changed.

```svelte
$effect(() => {
  console.log(count);
});
```

There's no dependency array. Svelte automatically tracks dependencies.

### How Svelte Uses Effects Under the Hood

When you use a reactive value in your template, Svelte creates an effect internally. For example, `{count}` in your template gets compiled to an effect that uses DOM helpers to update the text node.

The compiled output looks like:

```javascript
// Signal created from $state
let count = signal(0);

// Effect created for template binding
effect(() => {
  setText(node, count());
});
```

## Understanding Side Effects

A **side effect** is any operation that modifies something outside its own scope. Examples include:

- `console.log()` - logging to console
- `fetch()` - making network requests
- DOM manipulation
- Modifying global variables

A pure function has predictable output:

```javascript
function add(a, b) {
  return a + b;
}
```

An impure function with side effects:

```javascript
let result;

function add(a, b) {
  result = a + b; // Modifying external variable
  return result;
}
```

Your Svelte component is just a function. This is why we need effects to handle side effects within the component lifecycle.

## Effects Replace Lifecycle Functions

Effects replace Svelte 4's lifecycle methods:

| Svelte 4 | Svelte 5 |
|----------|----------|
| `onMount` | `$effect()` |
| `beforeUpdate` | `$effect.pre()` |
| `afterUpdate` | `$effect()` |
| `onDestroy` | Return cleanup function from `$effect()` |

### Basic Effect Usage

```svelte
$effect(() => {
  console.log('Component mounted');

  return () => {
    console.log('Component unmounted');
  };
});
```

The cleanup function runs:
- When the component unmounts
- Before the effect re-runs (when dependencies change)

### Effect Timing

**`$effect()`** - Runs after the DOM has been updated

```svelte
$effect(() => {
  console.log('After DOM update');
});
```

**`$effect.pre()`** - Runs before the DOM updates

```svelte
$effect.pre(() => {
  console.log('Before DOM update');
});
```

## When NOT to Use Effects

### Don't Use Effects to Derive Values

**Wrong:**

```svelte
let count = $state(0);
let double = $state(0);

$effect(() => {
  double = count * 2; // DON'T DO THIS
});
```

**Right:**

```svelte
let count = $state(0);
let double = $derived(count * 2);
```

### The Timing Problem

Effects run after the DOM updates. This can lead to stale values:

```svelte
let count = $state(0);
let double = $state(0);

$effect(() => {
  double = count * 2;
});

function increment() {
  count++;
  console.log(count, double); // double is stale!
}
```

The console will show out-of-sync values because the effect hasn't run yet.

### Don't Use Effects for State Synchronization

**Wrong:**

```svelte
let count = $state(0);
let history = $state([]);

$effect(() => {
  history.push(count); // Creates infinite loop!
});
```

Svelte's compiler detects this and prevents it, but don't rely on that.

**Right:**

```svelte
let count = $state(0);
let history = $state([]);

function increment() {
  count++;
  history.push(count);
}
```

## Using $untrack to Avoid Infinite Loops

If you must use an effect to update state, use `$untrack` to prevent tracking certain values:

```svelte
import { untrack } from 'svelte';

let count = $state(0);
let history = $state([]);

$effect(() => {
  if (count) {
    untrack(() => {
      history.push(count);
    });
  }
});
```

The `untrack` function makes values inside it non-reactive.

## Understanding the Microtask Queue

Effects run on the **microtask queue**. Understanding this is important for timing:

1. **Call Stack** - Synchronous code executes
2. **Microtask Queue** - User code (Promises, `queueMicrotask`, effects)
3. **Macrotask Queue** - Browser APIs (`setTimeout`, `setInterval`)

Effects use `queueMicrotask` under the hood:

```javascript
queueMicrotask(() => {
  // Effect runs here
});
```

The microtask queue runs after the call stack is empty, before the next macrotask.

## Practical Examples

### Timer with Cleanup

```svelte
let timer = $state(0);
let milliseconds = $state(1000);

$effect(() => {
  if (milliseconds) {
    const interval = setInterval(() => {
      timer++;
    }, milliseconds);

    return () => {
      clearInterval(interval);
    };
  }
});
```

The cleanup function prevents intervals from stacking when `milliseconds` changes.

### Effect Dependency Tracking

Effects track dependencies at the property level for objects:

```svelte
let count = $state({ value: 0 });

// Won't re-run when count.value changes
$effect(() => {
  console.log(count);
});

// Will re-run when count.value changes
$effect(() => {
  console.log(count.value);
});
```

For `$derived` values, the effect runs because derived creates a new object each time:

```svelte
let double = $derived(count * 2);

$effect(() => {
  console.log(double); // Runs on every update
});
```

## Using $inspect Instead of Effects

Don't use effects just to log values. Use `$inspect`:

```svelte
$inspect(count);
```

This logs whenever `count` changes, regardless of how deeply nested the change is.

You can also pass a callback:

```svelte
$inspect(count, (value) => {
  debugger; // Breakpoint when count changes
});
```

## Alternatives to Effects

### Use Event Listeners

Instead of using effects to react to input changes, use event handlers:

**With effect:**

```svelte
let value = $state('');

$effect(() => {
  value = value.toUpperCase();
});

<input bind:value />
```

**With event listener (better):**

```svelte
let value = $state('');

function uppercase(event) {
  value = event.target.value.toUpperCase();
}

<input {value} oninput={uppercase} />
```

### Use Writable Derived

For bindable derived values, use a writable derived:

```svelte
let value = $state('');

let uppercase = $derived.by({
  get() {
    return value.toUpperCase();
  },
  set(v) {
    value = v.toUpperCase();
  }
});

<input bind:value={uppercase.value} />
```

## Universal Reactivity

Svelte 5 supports reactivity outside components. Create reactive utilities in `.svelte.ts` files:

```typescript
// counter.svelte.ts
export function createCounter(initial = 0) {
  let value = $state(initial);

  return {
    get value() {
      return value;
    },
    set value(v) {
      value = v;
    },
    increment() {
      value++;
    }
  };
}
```

Use it in components:

```svelte
import { createCounter } from './counter.svelte.ts';

let counter = createCounter(10);

<button onclick={() => counter.increment()}>
  {counter.value}
</button>
```

### Local Storage Example

**Wrong - Using effects:**

```svelte
export function createStore(key, initial) {
  let value = $state(initial);

  $effect(() => {
    const stored = localStorage.getItem(key);
    if (stored) value = JSON.parse(stored);
  });

  $effect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  });

  return {
    get value() { return value; },
    set value(v) { value = v; }
  };
}
```

**Right - No effects needed:**

```svelte
export function createStore(key, initial) {
  const stored = localStorage.getItem(key);
  let value = $state(stored ? JSON.parse(stored) : initial);

  return {
    get value() {
      return value;
    },
    set value(v) {
      value = v;
      localStorage.setItem(key, JSON.stringify(v));
    }
  };
}
```

## Advanced: $effect.root

Effects must run inside the component lifecycle. If you need effects outside components, use `$effect.root`:

```svelte
export function createStore(key, initial) {
  return $effect.root(() => {
    let value = $state(initial);

    $effect(() => {
      localStorage.setItem(key, JSON.stringify(value));
    });

    return { value };
  });
}
```

This creates a parent root effect that allows child effects to run.

## Advanced: $effect.tracking

Check if code is running inside an effect or template:

```svelte
import { effect } from 'svelte';

if (effect.tracking()) {
  // Running inside effect or template
} else {
  // Running at top level
}
```

Use this to conditionally run code based on context.

## Practical Example: Chat Auto-Scroll

Converting Svelte 4 to Svelte 5:

**Svelte 4:**

```svelte
let comments = [];
let div;
let autoscroll = false;

beforeUpdate(() => {
  if (div) {
    const scrollableDistance = div.scrollHeight - div.offsetHeight;
    autoscroll = div.scrollTop > scrollableDistance - 20;
  }
});

afterUpdate(() => {
  if (autoscroll) {
    div.scrollTo(0, div.scrollHeight);
  }
});
```

**Svelte 5:**

```svelte
let comments = $state([]);
let div;

$effect.pre(() => {
  if (!div) return;

  if (comments.length) {
    const scrollableDistance = div.scrollHeight - div.offsetHeight;
    const autoscroll = div.scrollTop > scrollableDistance - 20;

    if (autoscroll) {
      queueMicrotask(() => {
        div.scrollTo(0, div.scrollHeight);
      });
    }
  }
});
```

Key changes:
- `beforeUpdate` → `$effect.pre()`
- `afterUpdate` → `queueMicrotask()`
- No need for separate `autoscroll` state
- Arrays can be mutated directly: `comments.push(comment)`

## Extracted Concepts

- **$effect** — Rune for running side effects, replaces lifecycle methods, runs after DOM updates
- **$effect.pre** — Runs before DOM updates, useful for measuring DOM state
- **$effect.root** — Creates parent effect for running effects outside component lifecycle
- **$effect.tracking** — Checks if code is running inside an effect or template context
- **$untrack** — Makes values inside it non-reactive to prevent infinite loops
- **$inspect** — Debugging rune that logs reactive values when they change
- **$derived** — Creates derived reactive values (read-only)
- **$derived.by** — Creates writable derived values with getter/setter
- **Microtask Queue** — Queue where effects run, executes after call stack before macrotasks
- **Side Effect** — Any operation that modifies something outside its own scope
- **Universal Reactivity** — Runes work in both components and `.svelte.ts` files
- **Cleanup Function** — Function returned from effect, runs on unmount and before re-run
- **Signal** — Underlying reactive primitive used by Svelte 5 (runes compile to signals)

## 04 Using Svelte Stores With Svelte 5 Runes To Create Runed Stores

This module demonstrates how to refactor a Svelte store into a "runed store" using Svelte 5's new runes system. You'll learn how to integrate external stores with the new reactivity model while maintaining backward compatibility.

## The Motion Library Example

The instructor created a motion library for animating values that can't usually be animated, such as SVGs and canvas elements. The library provides a clean API for defining animated values like camera, circle, and text properties.

You can animate values over time, including numbers and strings like colors, using the `to` method. Sound effects can be integrated alongside animations.

Since the project switched to Svelte 5, there's an inconsistency: the library uses traditional stores (with `$` syntax) while the rest of the project uses runes. This creates confusion for users who need to understand both reactivity models.

## Svelte 5 Runes Recap

Svelte 5 introduces a simpler reactivity model using runes:

**State Definition:**
```javascript
let count = $state(0);
```

**Derived State:**
```javascript
let double = $derived(count * 2);
```

**Effects:**
```javascript
$effect(() => {
  // Runs when dependencies change
});
```

Effects in Svelte 5 replace lifecycle methods like `$:` reactive statements and provide a unified API for side effects. This makes the framework simpler and more powerful than before.

## Backward Compatibility

Svelte 5 is completely backward compatible with Svelte 4. You can still use writable stores with runes:

```javascript
import { writable } from 'svelte/store';

let count = writable(0);
```

This works because Svelte automatically subscribes to the store under the hood and proxies the value through a rune.

### How Store-to-Rune Proxying Works

Svelte internally does something like this:

```javascript
let proxy = $state();
writable.subscribe(value => {
  proxy = value;
});
```

The store subscription updates the rune state, which is why the `$` syntax works seamlessly. This is the same technique we'll use to create runed stores.

## Refactoring the Motion Library

Before refactoring the core functionality, the instructor identified several design issues to fix:

### Issue 1: Audio File Type Assumption
The library assumed all audio files were MP3 format. The fix is to make the file type explicit:

```javascript
// Before: assumed .mp3
soundEffect(url)

// After: explicit file type
soundEffect('boom.mp3')
```

### Issue 2: Unnecessary Await Requirement
Animations required `await` by default, even when you didn't need to wait for completion. The fix is to play animations immediately and only use `await` when needed:

```javascript
// Before: must await
await camera.to({ x: 100 });

// After: plays immediately, await optional
camera.to({ x: 100 });
await camera.to({ x: 100 }); // only when you need to wait
```

### Issue 3: Method Chaining Complexity
The library supported method chaining using a "thenable" object pattern. While clever, it added unnecessary complexity:

```javascript
// The trick: making objects thenable
return {
  then(resolve) {
    // Loop over task queue
    for (let task of tasks) {
      await task;
    }
    resolve();
    tasks = []; // clear queue
  }
};
```

This pattern was removed because:
- It only runs when awaited (limiting usefulness)
- Adds mental overhead for users
- Not essential for the API

After removal, the code became simpler and animations play by default.

## Converting to a Runed Store

### Step 1: Rename File for Rune Support

When using runes outside of Svelte components, rename the file to use the `.svelte.ts` extension:

```bash
# Before
tween.ts

# After
tween.svelte.ts
```

This tells the Svelte compiler to handle runes properly outside component files.

### Step 2: Create a Class-Based Store

The refactor uses a class structure (though functions work too):

```typescript
class Tween<T> {
  value = $state<T>();
  #store;  // private field for the actual store

  constructor(value: T, options?: TweenOptions) {
    this.value = value;
    this.#store = tweenStore(value, options);
  }
}
```

**Key Points:**
- `value = $state<T>()` creates reactive state
- Private `#store` field holds the underlying Svelte store
- Svelte 5 compiles class fields with `$state` into getters and setters automatically

### Step 3: Subscribe to the Store

Use the same proxy technique that Svelte uses internally:

```typescript
constructor(value: T, options?: TweenOptions) {
  this.value = value;
  this.#store = tweenStore(value, options);

  // Subscribe and proxy values to the rune
  this.#store.subscribe(value => {
    this.value = value;
  });
}
```

This creates a bridge between the traditional store and the rune-based reactive system.

### Step 4: Handle Cleanup with Effects

Add proper unsubscribe logic using `$effect.pre`:

```typescript
constructor(value: T, options?: TweenOptions) {
  this.value = value;
  this.#store = tweenStore(value, options);

  $effect.pre(() => {
    const unsubscribe = this.#store.subscribe(value => {
      this.value = value;
    });

    // Cleanup function runs when component unmounts
    return unsubscribe;
  });
}
```

**Why `$effect.pre`?**
- Runs immediately (before other effects)
- Ensures subscription is active as soon as possible
- Returns cleanup function for proper memory management

### Step 5: Migrate Store Methods

Move the store methods to the class:

```typescript
class Tween<T> {
  // ... previous code ...

  to(value: Partial<T>, options?: TweenOptions) {
    if (typeof this.value === 'object') {
      this.#store.update(prev => ({ ...prev, ...value }));
    } else {
      this.#store.set(value);
    }
    return this;
  }

  reset() {
    this.#store.set(this.value);
  }
}
```

The `to` method handles both object and primitive values:
- For objects: spreads previous values and updates only specified properties
- For primitives: sets the value directly

### Step 6: Create a Factory Function

Wrap the class in a function to avoid the `new` keyword:

```typescript
export function tween<T>(value: T, options?: TweenOptions): Tween<T> {
  return new Tween(value, options);
}
```

## Improving Developer Experience with Dynamic Getters

The current API requires accessing `.value` on the instance:

```javascript
const coords = tween({ x: 0, y: 0 });

// Current: verbose
coords.value.x
coords.value.y

// Goal: direct access
coords.x
coords.y
```

### Creating Dynamic Properties

Use `Object.defineProperty` to create dynamic getters based on the value's properties:

```typescript
setProperties(value: T) {
  if (typeof value === 'object') {
    for (let key in value) {
      Object.defineProperty(this, key, {
        get() {
          return this.value[key];
        }
      });
    }
  }
}
```

**How it works:**
1. Loop over each property in the value object
2. Create a getter on the class instance for that property
3. The getter returns `this.value[key]`

Call this in the constructor:

```typescript
constructor(value: T, options?: TweenOptions) {
  this.value = value;
  this.#store = tweenStore(value, options);

  this.setProperties(value);  // Create dynamic getters

  $effect.pre(() => {
    // ... subscription code ...
  });
}
```

### Enhanced TypeScript Support

Add type intersection to include the object properties:

```typescript
class Tween<T> {
  // ... class implementation ...
}

export function tween<T>(
  value: T,
  options?: TweenOptions
): Tween<T> & T {
  return new Tween(value, options) as Tween<T> & T;
}
```

The `Tween<T> & T` intersection type tells TypeScript that the returned object includes both the class methods AND the properties from the value object.

### Result

Now you can access properties directly:

```javascript
const coords = tween({ x: 0, y: 0 });

// Clean API
coords.x  // returns 0
coords.y  // returns 0

// Still works
coords.to({ x: 100 });
```

## Key Takeaways

**Runed Store Pattern:**
- Rename file to `.svelte.ts` for rune support outside components
- Use `$state` to create reactive proxy of store value
- Subscribe to original store and update rune state
- Use `$effect.pre` for immediate subscription with cleanup

**Benefits:**
- Seamless integration of external stores with Svelte 5 runes
- Backward compatible with existing store-based code
- Cleaner API without `$` syntax
- Proper TypeScript support with generics

**Best Practices:**
- Use `$effect.pre` for immediate subscriptions
- Return cleanup functions from effects
- Create dynamic getters for better developer experience
- Provide proper TypeScript types with intersection types

## Next Steps

Consider learning how to implement tween functionality from scratch, including:
- Interpolating values over time
- Understanding easing functions
- Building animation progress systems

The core concept involves an `interpolate` function that calculates intermediate values based on animation progress between two states.

## 08 Different Ways To Share State In Svelte 5

In this module, you'll learn how to share state in Svelte 5 beyond just using accessors. You're not limited to getters and setters – you can use functions, classes, and other JavaScript patterns to manage and share reactive state.

## Understanding Rendering Across Frameworks

To understand why Svelte requires wrapping or boxing values when sharing state, it's helpful to compare how different frameworks handle rendering.

### React: Re-rendering the Component

In React, when state updates (using `useState`), the entire component function re-runs. This means you can use regular values without special syntax:

```jsx
const [count, setCount] = useState(0);
console.log(count); // Regular value, logs on every render
```

When you increment the count, the component re-renders completely, logging to the console each time. React doesn't care about fine-grained reactivity – it just re-runs the entire function.

### Solid: Fine-Grained Reactivity

Solid looks similar to React with its `createSignal`, but it's fundamentally different. The component function only runs once – Solid uses fine-grained reactivity instead:

```jsx
const [count, setCount] = createSignal(0);
console.log(count()); // Must invoke as function
```

You must invoke `count()` as a function because it's a signal, not a regular value. The component doesn't re-render – only the specific reactive dependencies update. You can even move signals outside the component completely:

```jsx
const [count, setCount] = createSignal(0);

function Counter() {
  return <div onClick={() => setCount(count() + 1)}>{count()}</div>;
}
```

### Vue: Ref Wrappers

Vue uses `ref` to create reactive wrappers. In JavaScript, you access values with `.value`:

```js
const count = ref(0);
count.value++; // Access via .value
```

In templates, Vue automatically unwraps refs for better developer experience:

```vue
<template>
  <div>{{ count }}</div> <!-- No .value needed -->
</template>
```

Vue components don't re-render the entire component – they use fine-grained reactivity like Svelte.

### Svelte: Compiler-Driven Reactivity

Svelte uses a compiler-driven approach with the `$state` rune:

```svelte
<script>
let count = $state(0);
console.log(count); // Logs once, not on updates
</script>

<button onclick={() => count++}>
  {count}
</button>
```

The `$state` compiler hint tells Svelte to turn this into a signal under the hood. The main benefit is better developer experience – you can treat `count` as a regular value in both script and template.

Looking at the compiled output, Svelte creates a signal using `$.state()` and generates template effects automatically. This is code you would otherwise have to write yourself (similar to Solid).

Svelte is closer to Solid than Vue in implementation, despite surface similarities to Vue. You can also use `$derived` for computed values without thinking about `.value` or function invocation:

```js
let count = $state(0);
let doubleCount = $derived(count * 2); // Regular value syntax
```

## The Import Boundary Problem

When you try to share state across files, you hit JavaScript's import boundary limitation:

```js
// counter.svelte.js
export let count = $state(0);

// Counter.svelte
import { count } from './counter.svelte.js';
count++; // Error: cannot assign to count because it is an import
```

**This is not a Svelte limitation – it's how JavaScript works.** According to MDN, imported values can only be modified by the exporter. The importing module can read the value but can't reassign it.

This was true in Svelte 4 with stores and remains true in Svelte 5 with runes. You've never been able to export a regular reactive value directly.

## Solution 1: Boxing Values with $state

To share state across the import boundary, you must wrap or box the value. Pass an object to `$state` to create a proxy:

```js
// counter.svelte.js
export const count = $state({ value: 0 });

// Counter.svelte
import { count } from './counter.svelte.js';
count.value++; // Works! You're modifying a property, not the import
```

Now you access the value via `.value`, similar to Vue refs. This works because you're not reassigning the import – you're modifying a property of the object.

You can also add methods to the state object:

```js
export const count = $state({
  value: 0,
  increment() {
    this.value++;
  }
});

// Usage
count.increment();
```

## Solution 2: Accessors (Get/Set)

Accessors provide cleaner syntax by using getters and setters:

```js
// counter.svelte.js
let count = $state(0);

export const counter = {
  get value() {
    return count;
  },
  set value(newCount) {
    count = newCount;
  },
  increment() {
    count++;
  }
};

// Counter.svelte
import { counter } from './counter.svelte.js';
counter.value++; // Clean syntax
counter.increment(); // Or use methods
```

## Solution 3: Factory Functions

Encapsulate state creation in a function:

```js
// counter.svelte.js
export function createCounter(initialValue = 0) {
  let count = $state({ value: initialValue });

  return {
    get value() {
      return count.value;
    },
    set value(newValue) {
      count.value = newValue;
    },
    increment() {
      count.value++;
    }
  };
}

// Counter.svelte
import { createCounter } from './counter.svelte.js';
const counter = createCounter(0);
```

## Solution 4: Functions (Solid-Style)

Return read and write functions as a tuple:

```js
// counter.svelte.js
export function createCounter(initialValue = 0) {
  let count = $state(initialValue);

  const read = () => count;
  const write = (value) => {
    count = value;
  };

  return [read, write] as const;
}

// Counter.svelte
import { createCounter } from './counter.svelte.js';
const [count, setCount] = createCounter(0);

setCount(count() + 1); // Invoke to read, call setter to write
```

This looks similar to Solid's API. However, using `.value` syntax is generally cleaner than invoking functions repeatedly.

## Solution 5: Classes

Classes automatically create getters and setters:

```js
// counter.svelte.js
export class Counter {
  count = $state({ value: 0 });

  increment = () => {
    this.count.value++;
  };
}

// Counter.svelte
import { Counter } from './counter.svelte.js';
const counter = new Counter();
const { count, increment } = counter; // Can destructure safely
```

With a class, you can also define custom getters and setters:

```js
export class Counter {
  #count = $state(0); // Private field

  get count() {
    return this.#count;
  }

  set count(value) {
    console.log('Count updated:', value);
    this.#count = value;
  }

  increment = () => {
    this.#count++;
  };
}
```

Svelte compiles this into a private variable with getter and setter methods, creating a proxy under the hood.

## Destructuring Pitfall

A common mistake is destructuring reactive values:

```js
const counter = createCounter(0);
const { count, increment } = counter; // Loses reactivity!

count.value++; // This won't update the UI
```

When you destructure `count`, you get the value at the time of destructuring. It's no longer reactive because it's just a snapshot.

**Solution:** Either don't destructure, or use a proxy (object state) to maintain reactivity:

```js
// This works because count is a proxy
let count = $state({ value: 0 });
return { count, increment };

// Can destructure safely
const { count, increment } = createCounter();
count.value++; // Works!
```

## Side Effects: Getters/Setters vs Effects

You have two options for side effects when state changes:

### Option 1: Setter Side Effects

```js
export const counter = {
  get value() {
    return count;
  },
  set value(newValue) {
    console.log('Count updated:', newValue);
    count = newValue;
  }
};
```

### Option 2: Effects

```js
export function createCounter() {
  let count = $state({ value: 0 });

  $effect(() => {
    console.log('Count updated:', count.value);
  });

  return count;
}
```

**Important caveat with effects:** If you initialize state outside component initialization, you must wrap effects in `$effect.root`:

```js
// Error: effect_orphan
const counter = createCounter();

// Fix: wrap in $effect.root
export function createCounter() {
  return $effect.root(() => {
    let count = $state({ value: 0 });

    $effect(() => {
      console.log(count.value);
    });

    return { count };
  });
}
```

Effects need to be wrapped in a root effect when used outside the component initialization phase. Otherwise, Svelte throws an "orphan effects" error.

**Recommendation:** Use getters/setters for most cases. Effects are better for complex side effects like syncing to local storage.

## Advanced: Derived State with Internal State

You can use `$derived` to create derived state that also manages its own internal state:

```js
const counter = $derived.by(() => {
  let count = $state({ value: 0 });

  return {
    count,
    increment() {
      count.value++;
    }
  };
});

const { count, increment } = counter;
```

This creates a derived value that encapsulates its own reactive state. You can destructure safely because the returned object is reactive.

## Server-Side Considerations

**Don't use state or effects on the server.** Effects don't run server-side, and you can create shared state bugs:

### Wrong: State in Load Functions

```js
// page.server.ts - DON'T DO THIS
let user = $state(null);

export async function load() {
  user = await fetchUser(); // Shared state bug!
  return { user };
}
```

This creates shared state across requests, leaking user data between different visitors.

### Right: Return Data, Use State in Component

```js
// page.server.ts
export async function load() {
  const user = await fetchUser();
  return { user }; // Pure function, no side effects
}

// +page.svelte
<script>
  export let data;

  let user = $state(data.user); // State in component
  setContext('user', user); // Share via context
</script>
```

Load functions should be pure – no side effects except occasional logging. Return the data, then use state or context inside components to manage reactivity.

## Extracted Concepts

- **Import boundary** — JavaScript prevents reassigning imported values; only the exporter can modify them
- **Boxing/wrapping** — Wrapping primitive values in objects to make them shareable across imports while maintaining reactivity
- **Accessors** — Getter and setter methods that provide clean syntax for reading and writing reactive values
- **Factory function** — A function that creates and returns new instances of stateful objects
- **Fine-grained reactivity** — Updating only the specific parts of the UI that depend on changed values, rather than re-rendering entire components
- **Proxy** — JavaScript Proxy object used by Svelte when passing objects to `$state`, enabling reactive property access
- **Effect root** — A wrapper required for effects used outside component initialization phase to prevent orphan effect errors
- **Component initialization phase** — The period when a Svelte component is first created, during which effects can be registered without explicit root wrapping
- **Pure function** — A function with no side effects that always returns the same output for the same input, required for server-side load functions

## 09 Avoid Async Effects In Svelte

This module explains why using async effects is problematic in Svelte 5 and shows proper alternatives for handling asynchronous operations.

## Why Async Effects Are Bad

Using async effects is discouraged because:

- The cleanup function won't run properly
- It can cause race conditions
- The same issue applies to `onMount` (legacy API)

## The Problem with Async Callbacks

When you make an effect callback async, you're returning a Promise instead of a cleanup function. Svelte doesn't expect a Promise, so your cleanup logic never executes.

**Example of the problem:**

```javascript
effect(async () => {
  // This async callback returns a Promise
  await sleep(1000);
  console.log(count);

  return () => {
    console.log('cleanup'); // This will NEVER run
  };
});
```

### Why the Cleanup Doesn't Run

When you use an async callback, the function signature becomes:

```javascript
const banana = async () => {
  return "banana";
};

// banana is now a Promise, not a function
console.log(banana); // Promise {...}
```

Svelte expects a function for cleanup, not a Promise.

## Dependency Tracking with Async Code

Values read asynchronously inside effects (after an `await`, inside a `setTimeout`, or in a `.then()`) will not be tracked as dependencies.

**Not tracked:**

```javascript
effect(async () => {
  await sleep(1000);
  console.log(count); // count is NOT tracked here
});
```

**Tracked:**

```javascript
effect(async () => {
  console.log(count); // count IS tracked here (before await)
  await sleep(1000);
});
```

### Using `.then()` Instead

Using `.then()` doesn't solve the tracking problem either:

```javascript
effect(() => {
  sleep(1000).then(() => {
    console.log(count); // Still NOT tracked
  });
});
```

To track `count`, you must reference it synchronously:

```javascript
effect(() => {
  count; // Track count as dependency
  sleep(1000).then(() => {
    console.log(count); // Now it reruns when count changes
  });
});
```

This acts as a "poor man's dependency array."

### Using `setTimeout`

The same behavior applies to `setTimeout`:

```javascript
effect(() => {
  setTimeout(() => {
    console.log(count); // NOT tracked
  }, 1000);
});
```

To track the dependency:

```javascript
effect(() => {
  count; // Track count
  setTimeout(() => {
    console.log(count); // Now reruns when count changes
  }, 1000);
});
```

## Proper Solutions for Async Operations

### Solution 1: Use `.then()`

Instead of making the effect callback async, use `.then()`:

```javascript
effect(() => {
  sleep(1000).then(() => {
    console.log(count);
  });
});
```

### Solution 2: Create an Async Function Inside

Define an async function inside the effect and call it:

```javascript
effect(() => {
  async function logCount() {
    await sleep(1000);
    console.log(count);
  }

  logCount();
});
```

### Solution 3: Immediately Invoked Function Expression (IIFE)

Use an IIFE to create an async scope:

```javascript
effect(() => {
  (async () => {
    await sleep(1000);
    console.log(count);
  })();
});
```

## How Effects Work Internally

Effects are essentially signals that run on the microtask queue. When you call `effect()`:

1. Svelte validates the effect function
2. Checks if it's a non-nested effect (should run after mount)
3. Sets a `name` property on the function in development mode
4. Defers execution by pushing to the component context's effect queue
5. Schedules the effect on the microtask queue via `queueMicrotask()`

### Effect Execution Flow

The internal implementation:

```javascript
// Schedules effect
function schedule_effect(signal) {
  if (is_micro_task_queued) return;
  is_micro_task_queued = true;

  queueMicrotask(process_microtask);
}

// Runs on microtask queue
function process_microtask() {
  is_micro_task_queued = false;
  check_infinite_loop();
  flush_queued_effects(); // Runs and cleans up effects
}
```

Effects run when everything else is done, unless you're using `effect.pre`.

## Legacy APIs to Avoid

- `onMount` - Has the same async problems as `effect`
- `onDestroy` - Can be replaced with effect cleanup functions
- These APIs are legacy and will eventually be removed

Use `effect()` instead for all side effects, including data fetching.

## Key Takeaways

- **Never make the effect callback async** - it returns a Promise, breaking cleanup
- **Reference dependencies synchronously** - values read after `await` or in callbacks aren't tracked
- **Use async functions inside effects** - create named or anonymous async functions and call them
- **Effects are signals** - they run on the microtask queue after other operations
- **Migrate from legacy APIs** - `onMount` and `onDestroy` will be removed in favor of `effect()`

## 10 Master The Svelte Context Api

Today we're going to talk about how to communicate between components without props and events in Svelte. We're going to learn about Svelte's Context API, implement it from scratch to understand how it works, and cover how to pass reactive state through context.

## The Prop Drilling Problem

I created four components named A, B, C, and D. I'm importing the parent component A inside `+page.svelte`, but I have a huge banana problem. When I define a prop named `banana`, the only component that cares about it is the D component, but we have to pass this as a prop through every component.

In component A we have the nested component B, so we have to pass the prop there. Then in component B we have to declare a prop and pass it again. The same is true for component C, just so the D component can get the banana prop. This is very tedious, so there has to be a better way.

## Building Context from Scratch

Let's pretend that the Context API from Svelte doesn't exist. Can we solve this problem on our own? Yes we can.

I made this special file named `context-at-home`. We need to define a context—let's use a Map. Then we export a function to set the context, and another function to get the context.

```javascript
const context = new Map();

export function setContext(key, value) {
  context.set(key, value);
}

export function getContext(key) {
  return context.get(key);
}

export function hasContext(key) {
  return context.has(key);
}

export function getAllContext() {
  return context;
}
```

This is how Svelte actually implements context under the hood—it uses a Map and a couple of simple functions.

## Using Our Custom Context

Let's open component A. This is where we want to set our context. I'm going to import from `context-at-home` and set the context:

```javascript
setContext('key', prop);
```

Now let's go through every component one by one and remove the props. In component B we don't need to pass a prop anymore. The same for component C.

In component D, we no longer need the prop because we have context:

```javascript
const banana = getContext('key');
```

We can even get the entire context:

```javascript
const allContext = [...getAllContext()];
```

We can also check if the context exists:

```javascript
console.log(hasContext('key')); // true
```

## Passing Reactivity Through Context

This is just regular JavaScript—we haven't even used Svelte's context yet. But before we do that, I want to talk about passing reactivity through context. This is the danger of not understanding JavaScript, because then you're not able to understand the framework you're using.

In this example, this isn't some black magic—it's just a Map under the hood. I think the problem is that people don't understand how state works, so they think they have to do something special to make it reactive. But that's not true.

In this case, `prop` is already reactive because we're passing an object. Svelte under the hood uses a reactive proxy, turning all the properties on the proxy into signals.

```svelte
<input type="text" bind:value={prop.banana} />
```

Now we can change the value and it's reactive.

### Passing Primitive Values

Let's say you're not passing an object—just a humble banana string. It's not an object, it's not reactive. Now you have to pass a reference to this value. You have to use a function, a getter and a setter.

Instead of passing a reactive value directly, you can pass a getter:

```javascript
setContext('key', {
  get banana() {
    return prop;
  }
});
```

Or use a getter and setter:

```javascript
setContext('key', {
  get banana() {
    return prop;
  },
  set banana(value) {
    prop = value;
  }
});
```

This really isn't magic. Repeat after me: **Svelte doesn't change how JavaScript works**. We can't just pass a primitive value like a string and expect it to be reactive, because we're only going to have that value at the time it was created. This is why things like proxy state are so awesome—they at least make this simpler.

## Using Unique Keys

There's one more important thing to talk about: using unique keys. Let me show you why you would want to use unique keys.

Let's say we're reusing this component. We're going to have some weird behavior. If we try typing in one component, both components are going to update. How can we solve this? We can solve this by using a unique key.

Let's create a unique key in component A:

```javascript
const key = Symbol('key');
```

If we compare `'key' === 'key'`, this returns `true`. But objects and symbols are always unique. If we compare `{} === {}`, it looks the same, but it's always going to return `false` because they're not the same. The same is true for symbols:

```javascript
Symbol('key') === Symbol('key'); // false
```

You can use either objects or symbols, but in most examples you're going to see people using symbols:

```javascript
const key = Symbol('key');
setContext(key, prop);
```

Now this is going to be unique each time. When we type in one component, it's just going to update that component. When we type in another component, it's just going to update the second component. You're going to have unique state.

**If you want state to be unique between multiple component instances, use a unique key.**

## Using Svelte's Context API

The only thing we have to change is update `context-at-home` to use Svelte's context:

```javascript
import { setContext, getContext } from 'svelte';
```

The API is the same. We no longer need the unique key because Svelte handles this internally.

## How Svelte's Context Works

Here's how Svelte's Context API works: when you set context in the parent element, it stores that information in the component tree. You can imagine that as some object with information about the component—maybe `component.c` or `context`—and then it sets the context on that component so the state is scoped to the component.

In the D component, when you say `getContext`, it walks up to the parent component that has the context and returns it.

Some of you might be asking: why don't we just use global state? It looks the same as context. The reason is because **using global state is unsafe, especially in the context of the server**.

We already saw the problem when we created two instances of the same component—how we shared state by accident. The same is true if you're using global state instead of context.

Global state only safely works when your state is only used client-side, when you're building a single-page application. If your state ends up being managed and updated on the server, it could end up being shared between sessions and users, causing bugs. It may give the false impression that certain state is global when in reality it should only be used in a certain part of your app.

If you read the Svelte docs, they tell you why you shouldn't use global state and why you shouldn't even use state on the server. They have this entire section on using stores with context on the server. If you're using server-side rendering, this is the only safe way to do it, because you can leak your users' information or worse.

## Looking at the Source Code

We learned that context is scoped to the component, but what does that actually mean? Of course, this isn't black magic. We can look at the source code.

We can go to the definition of `setContext`. We can see this function `setContext_internal` accepts a key and a context. It's initialized in this variable `context_map` using the function `get_or_init_context_map`. This function literally has `component_context.c`—if nothing exists on this, create a new Map, get the parent context with the context that we passed in.

We can see it searches through the parent until it finds the context. The `component_context` is just a regular variable at the top.

It's no different for receiving the context. `getContext` accepts a key, creates this `context_map` using the function `get_or_init_context_map`, uses `context_map.get` with the key we passed in, and returns the result.

It's really nothing intimidating—this is just regular JavaScript.

## Context is Scoped to Components

Now we understand what it means that the context is scoped to the component. Regardless of whether we define the context in component A or elsewhere, it's just going to be scoped to that parent and its children. When we want to get the context, it just walks up the tree through the parents until it finds the nearest context.

Of course, this isn't React—it's not going to re-render everything. It's just going to set or update the value in its place.

## Encapsulating Context Interactions

You're rarely going to see people use `setContext` and `getContext` directly, and that's mostly because it's not type-safe. Even the Svelte docs have a nice section on encapsulating context interactions.

I created a context file in `lib`:

```typescript
// context.ts
const BANANA_KEY = Symbol('banana');

type Banana = {
  banana: string;
};

export function setBananaContext(banana: Banana) {
  setContext(BANANA_KEY, banana);
}

export function getBananaContext(): Banana {
  return getContext(BANANA_KEY);
}
```

Now we have great type completion. If we go back to component A, instead of using `setContext`, we can say `setBananaContext` and pass in the value. If we pass in something it doesn't like, it's going to warn us that it doesn't match the `Banana` type.

In component D we can say:

```typescript
const banana = getBananaContext();
console.log(banana);
```

When I look at the type information, we have types and everything.

## Practical Example: Canvas Component

Before I go, I wanted to show you a practical example of using Svelte's Context API. In this example I have a simple canvas component and a child square component. I'm creating 10 columns and 10 rows and defining the size, x, y, and fill style using a helper gradient function, then passing the props as usual.

But we already see the ugliness of using this approach. We need to bind this component instance `canvas` to a variable just so we can pass it to square.

### Canvas Component

In canvas we have just regular props—nothing special. A reference to the canvas and `items` using a reactive version of Set (Svelte has reactive versions for Map, Set, Date, and so on).

We have an effect where we get the context of the canvas and clear the canvas each time `items` gets updated. We have an `addItem` function which accepts a draw function, then we add this function to `items`. Because it's reactive, it's going to rerun the effect and run every draw function and redraw everything.

The only reason I'm using this effect inside `addItem` is so it can run the cleanup when the effect is destroyed. We can export functions from a module like this, and when we get a reference to this module using `canvas`, we can invoke `addItem`.

### Square Component

Square has props like `canvas`, `x`, `y`, `size`, `fillStyle`, and `strokeStyle`. We use an effect when everything is mounted, then we say `canvas.addItem` and pass in this draw function. The draw function accepts the context, checks if there is a `strokeStyle` or `fillStyle`, and then draws the square.

### Fixing with Context API

Let's fix this by using the Context API. Let's go back to the canvas component. Instead of exporting the function, we can say:

```javascript
setContext('canvas', { addItem });
```

That's it. We don't have to do anything else.

Let's go back to the square function. We no longer need the effect because we can say:

```typescript
const { addItem } = getContext<{ addItem: Function }>('canvas');
addItem(draw);
```

Now we no longer need to pass `canvas` as a prop, and we no longer need to bind the value. When I refresh, everything works.

**That is the beauty of the Svelte Context API.**

## Extracted Concepts

- **Context API** — Mechanism for passing data between components without prop drilling
- **setContext(key, value)** — Sets context scoped to the current component and its children
- **getContext(key)** — Retrieves context from the nearest parent that set it
- **Symbol keys** — Used to create unique context keys for component instances
- **Reactive state** — Objects passed through context remain reactive via Svelte's proxy system
- **Getters/Setters** — Method for passing reactive primitive values through context
- **Component tree** — Context searches up through parent components to find matching keys
- **Server-side safety** — Context prevents state leakage between user sessions on the server
- **Type encapsulation** — Wrapping context functions provides type safety and better DX
- **Scoped state** — Context state is isolated to component subtrees, not global

## 11 How Svelte Reactivity Works

This module explores Svelte's reactivity system, explaining how it works under the hood using signals and fine-grained reactivity. The module dispels common myths about "compiler magic" and demonstrates reactivity through building a signals implementation from scratch.

## Common Framework Misconceptions

The discourse around framework reactivity often misunderstands what's happening under the hood. React developers say everything is "magic" while using the React compiler and obeying the rules of hooks. They don't understand the layers of abstraction but claim "React is just JavaScript" and resist the idea that JSX is a DSL (domain-specific language).

Similarly, Svelte developers say "it's not magic, it's magical" while using the Svelte compiler without understanding the layers of abstraction. They claim "Svelte is just JavaScript" and resist any mention of JSX.

The actual approach should be to treat it as code, solve problems, not fear being replaced by AI, and not complain about learning new things.

## The Evolution of Svelte's Reactivity

**Rich Harris** is the creator of Svelte and also made Vite, Rollup, and magic-string. In 2019, he gave one of the best talks about rethinking reactivity where he introduced **Svelte 3**, the version that became mainstream. At that point, Svelte wasn't widely used and people looked at it as an underdog. Today it's a mainstream framework used by trillion-dollar companies.

### Before Svelte 5

Before Svelte 5, the framework would statically analyze your code to see what had to change, then create functions for updating values. But this reactivity only worked inside Svelte components. To have reactivity outside of Svelte components, you had to use stores.

### The Shift to Signals

During this time, **Ryan Carniato**, the creator of Solid, was evangelizing signals. He didn't invent signals, but he made them popular. He made them so popular that almost every JavaScript framework today uses them. There's even a proposal to add signals to JavaScript itself.

In 2023, Svelte decided to switch to signals. **Dominic Gannaway** joined to work on Svelte full-time. Dominic is a wizard at JavaScript and compilers, having worked on React, Lexical, and Svelte. He worked on Svelte for around two years to rebuild the compiler.

Some people claimed Svelte was "just following trends" by using signals. Rich Harris mentioned they tried around 50 solutions before settling on signals. The reality is that the best ideas cross-pollinate around frameworks, and eventually everyone converges on the best approach to solving a problem. Signals are the perfect reactive primitive for building user interfaces.

## What Are Signals?

Signals are **observables with automatic subscriptions**. To understand them, first look at the **observer pattern**.

### The Observer Pattern

In the observer pattern, you have an observable (like `count`) and observers that can subscribe to it. When `count` updates, you send an update to all subscribers. This requires manual subscriptions.

This pattern appears in Svelte stores and in other places like event listeners. For example, with a button you add a click event listener and get the event.

### Signals vs Observer Pattern

Signals have different names in different frameworks: observables, atoms, subjects, refs, and more.

A **count signal** on its own doesn't do anything. Signals need **effects** to react to them changing. For example, an effect might change the inner text of an element. The same is true for derived values—under the hood, derived values are just effects that return a signal.

Instead of using a virtual DOM, you have a constantly updating **dependency graph**. Each time a value updates, everything reruns and the dependency graph updates. (Note: Not all frameworks work this way—Vue uses some form of signals but still uses a virtual DOM.)

### Quote from Ryan Carniato

> "Signals alone are not very interesting without their partner in crime: reactions. Reactions (also called effects, auto-runs, watches, or computeds) observe our signals and rerun them every time their value updates."

## How Svelte Compiles Code

If you have the Svelte extension, you can select "Show compiled code" to open the compiled Svelte code. Unlike some other frameworks, Svelte doesn't pretend to be something it's not. **Svelte is a language that extends HTML.**

### Creating State

When you create a piece of state called `count`:

```javascript
let count;
```

It's just a regular variable—not even reactive until you actually change the value.

If you create a paragraph tag:

```svelte
<p>{count}</p>
```

Svelte creates the DOM elements required. The compile code is human-readable JavaScript.

### Assignments Update Values

The first thing to learn about reactivity in Svelte is that **reassignments update values**:

```javascript
count += 1;
// or
count++;
```

When the Svelte compiler notices you're changing a value, it turns it into a **signal**.

An assignment is just a function call using a `set` method. You pass the signal in, get the latest value of count, then increment it by one.

The reactive part is the **template effect** that Svelte generates. This template effect has a `set_text` method which updates the text. Because the signal gets read inside this effect, it gets updated reactively. When `count` is read inside an effect, it adds the effect to its subscribers.

### Derived Values

When you use `$derived`:

```javascript
let double = $derived(count * 2);
```

The compiler turns this into a function. Because derived values are also effects, they have their own tracking context.

For example, if you create a function:

```javascript
function doubleCount() {
  return count * 2;
}
```

And invoke it in a derived:

```javascript
let double = $derived(doubleCount());
```

It works because the only important thing is that you read the signal. The effect knows who called it and adds it to its dependencies. When `double` updates, it runs the `doubleCount` function.

It doesn't matter if you pass a value or not because `count` is not some magic reactive container. The only thing that matters is that the function reruns when `double` updates because it's inside a **tracking context**.

### User Effects

You can create your own user effects with the `$effect` rune:

```javascript
$effect(() => {
  console.log(count, double);
});
```

This works the same way because these values are read inside this effect, and the function is added to their dependencies. When they update, the function runs.

**This is the beauty of signals.** This is runtime reactivity. This happens live as values update. Dependencies change and the dependency graph gets updated.

## Implementing Signals from Scratch

Let's build a simple signals implementation to understand how everything works.

### Creating State

```javascript
function state(value) {
  const signal = {
    value,
    subscribers: new Set()
  };
  return signal;
}
```

As you can see, signals don't do anything on their own. They need effects to react to them.

### Creating Effects

```javascript
let activeEffect = null;

function effect(fn) {
  activeEffect = fn;
  fn();
}
```

First, we track the active effect so we know who called it. When an effect runs:

```javascript
effect(() => {
  console.log(get(count));
});
```

We push this function to be the currently active effect. When a value inside an effect gets read, it can check "if there's an active effect (who called me)", then add the effect to the subscribers. Later, when we update the value, we can notify the subscribers.

### Getting Values

```javascript
function get(signal) {
  if (activeEffect) {
    signal.subscribers.add(activeEffect);
  }
  return signal.value;
}
```

### Setting Values

```javascript
function set(signal, newValue) {
  signal.value = newValue;
  signal.subscribers.forEach(effect => {
    effect();
  });
}
```

That's it.

### Using the Signals Implementation

First, create state:

```javascript
let count = state(0);
```

Create the effect:

```javascript
effect(() => {
  p.textContent = get(count);
});
```

The function is added as an active effect. When we read the signal, it asks itself "who called me?" and adds this function to its subscribers.

Update the signal:

```javascript
setInterval(() => {
  set(count, get(count) + 1);
}, 1000);
```

**This is the power of signals.** Instead of doing manual subscriptions, dependencies get automatically tracked.

Svelte doesn't do some crazy compiler magic under the hood. Svelte mostly optimizes for developer experience. As React developers love to say, "it's just JavaScript."

### Implementing Derived

Derived values are basically just like effects and they return a signal:

```javascript
export function derived(fn) {
  const signal = state(fn());

  effect(() => {
    set(signal, fn());
  });

  return signal;
}
```

Now you can create a derived value:

```javascript
let double = derived(() => get(count) * 2);
```

## Understanding the Dependency Graph (Rich Harris Explanation)

When people talk about signals, they're generally talking about three things: **sources**, **derivations**, and **effects**.

- **Sources** contain values
- **Effects** are things that react to changes to those values
- **Derivations** are both values and reactions—they update when their dependencies change, but effects and derivations can also depend on them

You end up with a dependency graph with sources at the top, effects at the bottom, and derivations potentially in the middle.

### Examples

- **Source**: `count = $state(0)`
- **Derivation**: `doubled = $derived(count * 2)`
- **Effect**: A function that updates the text content of an element, or an effect you define yourself with the `$effect` rune

In a real app, this graph will look much more complicated, but the essence is just this.

### How Updates Work

When `count` changes, we don't rerun effects immediately. Instead:

1. Follow the edges of the dependency graph
2. Mark reactions as **dirty** or (in the case of derivations) **maybe dirty** (because it could re-evaluate to the same value)
3. Wait a bit—enough time for any other sources to update, but before the browser repaints
4. Run the effects

Sometimes if an effect depends on a maybe dirty derivation, we'll skip it if it turns out that nothing actually changed.

### The Effect Graph

We don't just run effects immediately because a text update could be inside an if block. If the if block is destroyed, we don't want to have run that code and updated that DOM. In some cases, it could even cause an error.

Instead, we put all of the effects in another graph where your root component is mounted at the top and other effects are recursively nested inside it. When an effect is marked as dirty, we mark all the edges between it and the root as dirty so that we can traverse the effect graph from top to bottom efficiently by skipping over any branches that we know are clean and preserving the sibling order of effects.

### Types of Effects

- **User effects**: Created with the `$effect` rune
- **Template effects**: Update text nodes and DOM attributes
- **Block effects**: Things like if blocks, each blocks, and key blocks
- **Branch effects**: Things immediately inside those blocks
- **Async effects**: Created when you have an await expression inside a derived or in the template

### Async Processing

In the async world, when we process the effect graph, we do it a little bit differently because we don't want anything to update in the DOM while async work is still pending.

We still traverse the effect graph from top to bottom, but instead of running template effects or user effects, we put them into an array. We do the same thing for async effects.

When we run block effects, instead of putting the newly created branch into the DOM or taking an old branch out of the DOM, we create elements in an offscreen fragment and stash the append or remove operation away in a callback.

At the end of that process, nothing has actually changed. We have an array of async effects, an array of template effects and user effects, and an array of callbacks.

If we're not waiting for any async work to happen, then we run the template effects and the block callbacks, which brings the DOM up to date. But if we are waiting for async work, then we run those effects and stash all of the other effects away for later.

When those newly created promises resolve, we mark the stashed effects as dirty and repeat the process as many times as it takes for all of the async work to settle.

## Key Takeaways

- **Svelte's reactivity is not compiler magic**—it's based on signals, a runtime reactivity system
- **Signals are observables with automatic subscriptions**—dependencies are tracked automatically when values are read inside effects
- **The dependency graph updates in real-time**—as values change, effects rerun and the graph updates
- **Three core primitives**: sources (state), derivations (computed values), and effects (reactions)
- **Effects form their own graph**—ensuring proper ordering and avoiding unnecessary DOM updates
- **Async effects are handled specially**—preventing DOM updates while async work is pending

## 12 Avoid Leaking User Data In Your Sveltekit App

This module covers a critical security concern: how to safely share state between components in SvelteKit without leaking user data across server-side rendered requests.

## The Problem: Global State on the Server

One common question developers ask is: "How can I get my page data and pass it to unrelated components?" Many developers think about using global state to share data across components, but this is a really bad idea when using server-side rendering.

The focus of this video is learning why having shared state on the server, especially when using server-side rendering, is dangerous.

## Understanding the Browser vs Server Architecture

### The Blurred Line Between Frontend and Backend

JavaScript frameworks blur the line between frontend and backend:

- **Browser (Client)**: Runs Svelte as the UI framework/compiler
- **Backend**: SvelteKit is the backend framework that runs on Node.js by default (but can run anywhere JavaScript runs through adapters)

### How Servers Work

A server is a long-running process in the background. While we often say a server is stateless, that's not entirely true. You can define variables and have state in memory as long as the server is running.

**Critical distinction**: Server state is separate from client state. If you set state in `page.server.ts`, it won't magically update state in the client.

## Safe Options for Sharing State

There are two safe options you can use:

1. **The page store from SvelteKit**
2. **The context API**

## How SvelteKit Data Loading Works

### Page Loading Functions

In `page.server.ts`, you return a load function to get data for the page. Another benefit is using server-side rendering to return the HTML file.

You can also use `page.ts` to return a load function that runs on both server and client.

**Important**: You can use both `page.server.ts` and `page.ts` at the same time. You can pass data from `page.server.ts` to `page.ts`.

### Why Use Both?

One example: you receive images from the server and want to await them on the client so the images are loaded before navigating, avoiding layout shift. You await the data inside the function, and only navigate when everything is ready.

### Server-Side Rendering vs Client-Side Navigation

By default, when you load a page the first time, it's server-side rendered. Then SvelteKit loads on the page and behaves like a single-page application.

When you navigate to another route, you don't receive HTML—you get JSON so it can update the data on the page. This gives you the best of both worlds.

**Example from svelte.dev**:

- Initial page load: Returns the entire HTML document (server-side rendered)
- Subsequent navigation: Returns JSON data (`data.json`) instead of HTML
- Single-page application experience with pre-loading on hover

You can access any endpoint's data by appending `__data.json` to the URL.

## Understanding Load Functions

### `+page.svelte`

A component that defines a page in your app. By default, pages render:

- **On the server** using server-side rendering for the initial request
- **In the browser** using client-side rendering

The server sends the HTML document on the first request, then it gets hydrated with interactivity.

Pages receive data from load functions via the `data` prop. The types are completely optional because SvelteKit automatically generates them.

### `+page.js`

A page often needs to load data before it can be rendered. For this, use `+page.js` that exports a load function.

This function runs alongside `+page.svelte`, which means it runs:

- On the server during server-side rendering
- In the browser during client-side navigation

### `+page.server.js`

If your load function can only run on the server (for example, if it needs to fetch data from a database or access private environment variables like API keys), rename `+page.js` to `+page.server.js`.

Another use for `+page.js`: You can disable server-side rendering to build a single-page application with Svelte.

## Why Shared State on the Server is Dangerous

The SvelteKit docs have a useful section on State Management explaining why you should avoid shared state on the server, especially with server-side rendering.

### The Documentation Explanation

**Browsers are stateful**: State is stored in memory as the user interacts with the application.

**Servers are stateless**: The content of the response is determined entirely by the content of the request.

In reality, servers are often long-lived and shared by multiple users. Even serverless functions are often shared. For that reason, it's important not to store data in shared variables.

### The Danger: Single Source of Truth

If you have state on the server that is separate from the client, and this is your single source of truth, then multiple users looking at your page will receive state based on what is on the server. This creates a serious problem.

**This isn't a problem in single-page applications** because everyone has separate state when they load the page on the client. But with server-side rendering, you have a single source of truth that's shared.

## Demonstration: The User Data Leak

### Setting Up Global State (Wrong Way)

Here's an example showing the problem. In `page.server.ts`:

```javascript
let secret = "secret1234";  // ❌ NEVER DO THIS
console.log(secret);
```

This creates global state on the server. When multiple users visit the site, they all share this same state.

### The Timing Problem

The issue becomes even more visible with an artificial delay:

```javascript
// In page.ts
user.set(event.locals.user);
await new Promise(resolve => setTimeout(resolve, 4000));  // 4 second delay
```

With this delay, if you open two browser windows:

1. Refresh the first window
2. Quickly refresh the second window
3. Watch as both windows share the same user data

This is extremely dangerous if you have data you don't want shared between users.

### The Worst Part: No JavaScript Scenario

If you have a bad internet connection or JavaScript is disabled, the state never updates on the client. Users can see other users' data permanently.

## No Side Effects in Load Functions

The SvelteKit docs emphasize: Your load function should be pure—no side effects (except maybe the occasional `console.log`).

### Temptation: Writing to a Store in Load

You might be tempted to write to a store inside the load function so you can use the store value in your components:

```javascript
// ❌ NEVER DO THIS
export function load({ data }) {
  user.set(data.user);
  return data;
}
```

This is dangerous because the server becomes the single source of truth, and you get stale data shared between users.

### The Difference Between page.ts and page.server.ts

Using `page.server.ts` with global state is slightly different:

```javascript
// In page.server.ts
import { user } from './user.svelte';
user.set(event.locals.user);
```

The state is separate from the client, so the client shows blank values. However, you still have the same problem on the server—you're setting shared state that can leak between users.

## Safe Solutions

### Solution 1: The Page Store from SvelteKit

The page store provides a safe way to share data:

```javascript
// In d.svelte (deeply nested component)
import { page } from '$app/stores';

// Access data directly
$page.data.user
```

Whatever you return from a load function on a page is available to that route, including its parents.

**How it works**: SvelteKit uses context under the hood. The store is scoped to the component, not shared globally on the server.

### How Stores Work with Runes

Stores are signals in Svelte 5. What Svelte does under the hood is subscribe to the store but return a signal which updates when the store does.

This is done so you can use stores with runes without problems. For example, you can use a derived rune with a store, and when the store updates, it also updates the derived expression.

**Compiled output example**:

```javascript
// What $page.data becomes:
const $page = store_get(page);
```

The `store_get` function:

1. Creates a source signal
2. Subscribes to the store
3. Updates the signal each time the store updates
4. Returns the signal

### How SvelteKit Makes Stores Safe

In the browser, SvelteKit creates a writable store. On the server, it uses context so the store is only scoped to that component. This is the safe way to do it.

**The actual syntax**:

```javascript
// This syntax:
$page.data

// Is syntactic sugar for:
page.subscribe(value => {
  // Do something when it updates
})
```

### Solution 2: The Context API

You can create your own context-based state:

```javascript
// In +page.svelte (top-level component)
import { setContext } from 'svelte';

let user = $state({
  id: data.user.id,
  username: data.user.username
});

// Make it reactive with a proxy
$effect(() => {
  user.id = data.user.id;
  user.username = data.user.username;
  // Or simply:
  user = data.user;
});

setContext('user', user);
```

**In nested components**:

```javascript
// In d.svelte (deeply nested)
import { getContext } from 'svelte';

const user = getContext('user');

// Use directly:
{user.id}
{user.username}
```

This is safe because the state is scoped to the component on the client, not shared on the server.

### Passing Reactive State to Context

**Important**: You need to pass reactive values, not primitives:

```javascript
// ❌ Won't work - just passes the string value
let banana = $state('banana');
setContext('fruit', banana);

// ✅ Works - passes reactive reference
let banana = $state('banana');
setContext('fruit', () => banana);  // Function
setContext('fruit', { banana });     // Object
```

When you pass a primitive, Svelte gets the value (just a regular string), which isn't reactive. Use functions, objects, classes, or accessors to maintain reactivity.

## Best Practices

### Always Return Data from Server Load Functions

```javascript
// In +page.server.ts
export function load({ locals }) {
  if (!locals.user) {
    throw redirect(302, '/login');
  }
  return { user: locals.user };  // ✅ Return the data
}
```

### Use Context or Page Store on the Client

```javascript
// In +page.svelte
import { setContext } from 'svelte';

let user = $state(data.user);
setContext('user', user);
```

### Never Use Global State on the Server

```javascript
// ❌ NEVER DO THIS
let globalUser;

export function load({ locals }) {
  globalUser = locals.user;  // Shared between all users!
  return { user: locals.user };
}
```

## Summary

**The Problem**: Global state on the server is shared between all users, creating serious security and data leakage issues.

**Safe Solutions**:
1. Use the **page store** from SvelteKit (`$app/stores`)
2. Use the **context API** (`setContext`/`getContext`)

Both solutions scope state to individual components/users on the client, preventing data leaks. Always return data from server load functions and manage state safely on the client.

## Additional Resources

- [Data Loading in SvelteKit](https://joyofcode.xyz/sveltekit-data-flow) - Understanding how data flows in SvelteKit
- [Sharing State Without Props and Events](https://joyofcode.xyz/sveltekit-context-api) - Deep dive into the context API

## 13 Everything You Should Know About Working With Forms In Sveltekit

## Project Setup

This is a regular skeleton SvelteKit project with TypeScript. The root layout includes Pico CSS for styling with some global styles:

- Padding for the body
- Rounded corners for inputs and buttons

## Server-Only Modules

SvelteKit supports server-only modules by using the `.server.ts` naming convention. This works for any file, not just data loading files.

### Creating a Fake Database

Created a server-only module in `lib/server/database.ts`:

```typescript
type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

const todos: Todo[] = [
  {
    id: Date.now(),
    text: 'learn how forms work',
    completed: false
  }
];

export function getTodos() {
  return todos;
}

export function addTodo(text: string) {
  const todo: Todo = {
    id: Date.now(),
    text,
    completed: false
  };
  todos.push(todo);
}

export function removeTodo(id: number) {
  todos = todos.filter(todo => todo.id !== id);
}

export function clearTodos() {
  todos = [];
}
```

## Introduction to Forms

A **form** is a way to exchange information between the browser and the server. It's a container for form controls (also called widgets) with optional attributes to configure how the form behaves.

### Form Attributes

**Action attribute**: Defines the location (URL) where the form's collected data should be sent.

**Method attribute**: Defines which HTTP method to send the data with.

Both attributes are optional. If you exclude the action, the form will get or post to itself.

### GET vs POST Methods

**GET method**: Requests a resource on the server and appends the form data at the end of the URL as query parameters.

Example:
```html
<form method="get" action="/login">
  <input type="text" name="user" />
  <input type="password" name="password" />
  <button type="submit">Login</button>
</form>
```

Result: Redirects to `/login?user=test&password=1234`

**Issues with GET**:
- Insecure for passwords (visible in URL)
- Not suitable for large amounts of data
- Body is empty

**POST method**: Similar to GET but can return a resource depending on the data sent in the request body. No data is appended to the URL—it's included in the body instead.

The data is sent as a list of key-value pairs. The **name attribute** is essential because it determines what values are assigned on the server.

## Working with Forms Using API Endpoints

### Setting Up Routes

Created a `todos` folder with route files:
- `+page.svelte` - The page component
- `+page.server.ts` - Data for the page
- `+server.ts` - Endpoint for form submission

### Loading Data

```typescript
// +page.server.ts
import type { PageServerLoad } from './$types';
import { getTodos } from '$lib/server/database';

export const load: PageServerLoad = async () => {
  const todos = getTodos();
  return { todos };
};
```

### Creating Forms

```svelte
<form on:submit|preventDefault={addTodo} method="post">
  <input type="text" name="todo" />
  <button type="submit">Add todo</button>
</form>

{#each data.todos as todo}
  <li>
    <span>{todo.text}</span>
    <form on:submit|preventDefault={removeTodo} method="post">
      <input type="hidden" name="id" value={todo.id} />
      <button type="submit" class="delete">✖</button>
    </form>
  </li>
{/each}
```

**Hidden input fields** are used to send data like IDs to the server without displaying them to the user.

### API Endpoint Implementation

```typescript
// +server.ts
import { json } from '@sveltejs/kit';
import { addTodo, removeTodo } from '$lib/server/database';
import type { RequestHandler } from './$types';

type Data = {
  success: boolean;
  errors: Record<string, string>;
};

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const todo = formData.get('todo') as string;

  const data: Data = {
    success: false,
    errors: {}
  };

  if (!todo) {
    data.errors.todo = 'required';
    return json(data, { status: 400 });
  }

  addTodo(todo);
  data.success = true;
  return json(data);
};

export const DELETE: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const todoId = Number(formData.get('id') as string);

  removeTodo(todoId);
  return json({ success: true });
};
```

### Client-Side Handling

```typescript
let form: Data | undefined;

async function addTodo(event: Event) {
  const formElement = event.target as HTMLFormElement;
  const data = new FormData(formElement);

  const response = await fetch(formElement.action, {
    method: 'post',
    body: data
  });

  const responseData = await response.json();
  form = responseData;

  formElement.reset();
  await invalidateAll();
}
```

**Key points**:
- Use `invalidateAll()` to rerun load functions and update the page
- Access form properties like `formElement.action` and `formElement.method`
- Reset the form after successful submission with `formElement.reset()`

### Limitations of API Endpoints

This approach has several downsides:
- Only works with JavaScript enabled
- Requires manual implementation of fetch logic
- Need to create custom validation
- Must manually use invalidate to refresh data
- Tedious for complex forms

## SvelteKit Form Actions

Form actions provide a better way to work with forms. They map methods to actions inside a `+page.server.ts` file.

### Converting to Form Actions

Delete the `+server.ts` file and add actions to `+page.server.ts`:

```typescript
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
  addTodo: async ({ request }) => {
    const formData = await request.formData();
    const todo = formData.get('todo') as string;

    if (!todo) {
      return fail(400, {
        todo,
        missing: true
      });
    }

    addTodo(todo);
    return { success: true };
  },

  removeTodo: async ({ request }) => {
    const formData = await request.formData();
    const todoId = Number(formData.get('id') as string);

    removeTodo(todoId);
    return { success: true };
  },

  clearTodos: () => {
    clearTodos();
  }
};
```

### Invoking Actions

Use the `action` attribute with `?/` prefix to invoke specific actions:

```svelte
<form method="post" action="?/addTodo">
  <input type="text" name="todo" />
  <button type="submit">Add todo</button>
</form>

<form method="post" action="?/removeTodo">
  <input type="hidden" name="id" value={todo.id} />
  <button type="submit">Delete</button>
</form>
```

**Override action on buttons** using the `formaction` attribute:

```svelte
<form method="post" action="?/addTodo">
  <input type="text" name="todo" />
  <button type="submit">Add todo</button>
  <button formaction="?/clearTodos" class="secondary">Clear</button>
</form>
```

This uses web standards—the `formaction` attribute overrides the form's action attribute.

### Benefits of Form Actions

- Works without JavaScript
- Less code than API endpoints
- No need to manually call invalidate
- SvelteKit handles form data automatically
- Better mental model with named actions

## Progressive Form Enhancement

Use the `use:enhance` action to improve the user experience when JavaScript is available:

```svelte
<script>
  import { enhance } from '$app/forms';
</script>

<form method="post" action="?/addTodo" use:enhance>
  <input type="text" name="todo" />
  <button type="submit">Add todo</button>
</form>
```

**What `use:enhance` does**:
- Updates the form property automatically
- Updates `$page.form` and `$page.status` stores
- Resets the form after submission
- Reruns load functions
- Uses `goto` for redirects
- Uses client-side rendering instead of full page refresh

The form still works before JavaScript loads, making your app more resilient.

### Customizing `use:enhance`

Provide a submit function to customize behavior:

```typescript
import type { SubmitFunction } from '@sveltejs/kit';

const addTodo: SubmitFunction = ({ formData, cancel }) => {
  // Do something before form submits
  // Can do client-side validation here

  return async ({ result, update }) => {
    // Do something after form submits
    await update();
  };
};
```

**Available in the input object**:
- `action` - URL of the action
- `cancel()` - Cancel the request
- `formData` - The form data being submitted
- `formElement` - Reference to the form element

**Available in the return callback**:
- `result` - Result from the action
- `update()` - Runs the default enhance logic
- `formData` - The submitted form data
- `formElement` - Reference to the form element

### Loading UI Example

```typescript
let loading = false;

const addTodo: SubmitFunction = () => {
  loading = true;

  return async ({ update }) => {
    await update();
    loading = false;
  };
};
```

```svelte
<form method="post" action="?/addTodo" use:enhance={addTodo}>
  <input type="text" name="todo" />
  <button type="submit" aria-busy={loading} class:secondary={loading}>
    {#if loading}
      <!-- Show loading state -->
    {:else}
      Add todo
    {/if}
  </button>
</form>
```

## Form Validation

### Manual Validation

```typescript
export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const user = formData.get('user') as string;
    const password = formData.get('password') as string;

    const errors: Record<string, unknown> = {};

    if (!user || typeof user !== 'string') {
      errors.user = 'required';
    }

    if (!password || typeof password !== 'string') {
      errors.password = 'required';
    }

    if (Object.keys(errors).length) {
      return fail(400, {
        data: Object.fromEntries(formData),
        errors
      });
    }

    // Login successful
    throw redirect(303, '/todos');
  }
};
```

Display errors in the template:

```svelte
<script>
  export let form: ActionData;
</script>

<form method="post" use:enhance>
  <input type="text" name="user" value={form?.data?.user ?? ''} />
  {#if form?.errors?.user}
    <p class="error">Name is required</p>
  {/if}

  <input type="password" name="password" />
  {#if form?.errors?.password}
    <p class="error">Password is required</p>
  {/if}

  <button type="submit">Login</button>
</form>
```

### Validation with Zod

Install dependencies:

```bash
pnpm i zod zod-form-data
```

Create a validation schema:

```typescript
import { zfd } from 'zod-form-data';
import { fail, redirect } from '@sveltejs/kit';

const loginSchema = zfd.formData({
  user: zfd.text(),
  password: zfd.text()
});

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      return fail(400, {
        data: Object.fromEntries(formData),
        errors: result.error.flatten().fieldErrors
      });
    }

    throw redirect(303, '/todos');
  }
};
```

**Benefits of Zod**:
- Less boilerplate code
- Reusable schemas
- Type-safe validation
- Works with `formData` and `URLSearchParams`
- Can be abstracted into utility functions

## Advanced `use:enhance` Customization

### `update()` vs `applyAction()`

**`update()`**: Updates form data only for the current route.

**`applyAction(result)`**: Updates the `$page.form` store regardless of where the form was submitted from.

### Reusing Forms Across Pages

```svelte
<script>
  import { applyAction } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';

  const login: SubmitFunction = () => {
    return async ({ result }) => {
      await applyAction(result);
    };
  };
</script>

<form method="post" action="/login" use:enhance={login}>
  <!-- Form fields -->
</form>
```

This allows you to use a login form on any page and have it properly update validation errors.

### Conditional Logic Based on Result Type

```typescript
const login: SubmitFunction = () => {
  return async ({ result }) => {
    if (result.type === 'success' || result.type === 'redirect') {
      await applyAction(result);
    }
    // Only apply logic for success/redirect, ignore failures
  };
};
```

**Result types**:
- `success` - Action completed successfully
- `failure` - Validation or other errors
- `redirect` - Server returned a redirect
- `error` - Server error occurred

### What `applyAction()` Does

Based on the `result.type`:

- **`success` or `failure`**: Updates `form`, `$page.form`, and `$page.status` regardless of where the form was submitted
- **`redirect`**: Invokes `goto` with `result.location`
- **`error`**: Renders the nearest `+error.svelte` page

## Extracted Concepts

- **Form** — Container for form controls that exchanges information between browser and server
- **Form Actions** — Named methods in `+page.server.ts` that map to form submissions
- **Progressive Enhancement** — Form works before JavaScript loads, enhanced when available
- **`use:enhance`** — SvelteKit action that intercepts form submission for better UX
- **`fail()`** — Returns validation errors with status code from form actions
- **`applyAction()`** — Updates page stores from any route, unlike `update()` which only works for current route
- **Server-only modules** — Files with `.server.ts` suffix that are only available on the server
- **Hidden input fields** — Form inputs with `type="hidden"` used to send data like IDs without displaying them
- **`formaction` attribute** — HTML attribute that overrides a form's action on specific buttons
- **Zod validation** — Schema-based validation library that works seamlessly with SvelteKit form data

## 14 Full Stack Sveltekit Crud App Using Remote Functions Tutorial

Remote functions zijn een nieuwe, experimentele manier om met data te werken in SvelteKit. Ze functioneren vergelijkbaar met tRPC en laten je functies van de server aanroepen op de client alsof het reguliere functies zijn. Onder de motorkap zijn het gewoon fetch requests.

## Remote Functions Overzicht

Remote functions elimineren de noodzaak voor traditionele load functions en form actions in SvelteKit. In plaats van voor elke route een `+page.server.ts` bestand te maken met load functions, kun je direct server functies aanroepen vanuit je components.

### Configuratie

Om remote functions te gebruiken, moet je ze eerst inschakelen in de Svelte config:

```typescript
// svelte.config.js
{
  compiler: {
    async: true
  },
  kit: {
    remoteFunctions: true
  }
}
```

Remote functions moeten in bestanden met de naam `*.remote.ts` of `*.remote.js` worden geplaatst. Je kunt ze overal in je project plaatsen - in routes, naast components, of in een speciale API map.

## Query Remote Function

De query remote function wordt gebruikt om dynamische data van de server te lezen, zoals posts uit een database. Het retourneert een promise die je direct in templates kunt gebruiken dankzij async Svelte.

```typescript
// lib/api/post.remote.ts
import { query } from '@sveltejs/kit';
import { db } from '$lib/server/database';
import * as table from '$lib/server/database/schema';

export const getPosts = query(async () => {
  const posts = await db.select().from(table.post);
  return posts;
});
```

### Query Gebruiken in Templates

```svelte
<script>
  import { getPosts } from '$lib/api/post.remote';

  // Direct gebruiken met await in template
</script>

{#await getPosts()}
  <p>Loading...</p>
{:then posts}
  {#each posts as post}
    <h2>{post.title}</h2>
  {/each}
{/await}
```

Of op top level van script block:

```svelte
<script>
  import { getPosts } from '$lib/api/post.remote';

  const posts = await getPosts();
</script>

{#each posts as post}
  <h2>{post.title}</h2>
{/each}
```

### Query met Parameters

```typescript
export const getPost = query(z.string(), async (slug) => {
  const [post] = await db
    .select()
    .from(table.post)
    .where(eq(table.post.slug, slug));

  if (!post) {
    throw error(404, 'Post not found');
  }

  return post;
});
```

### Alternatieve Syntax

Je kunt ook de query toewijzen zonder await voor TanStack Query-achtige API:

```svelte
<script>
  const posts = getPosts(); // Niet awaiten
</script>

{#if posts.loading}
  <p>Loading...</p>
{:else if posts.error}
  <p>Error: {posts.error}</p>
{:else}
  {#each posts.current as post}
    <h2>{post.title}</h2>
  {/each}
{/if}
```

### Query Batching

Voor het oplossen van N+1 problemen kun je `query.batch` gebruiken:

```typescript
// In plaats van meerdere requests:
{#each cities as city}
  {await getWeather(city)}
{/each}

// Single request met batch:
const weather = await query.batch(getWeather, cities);
```

## Form Remote Function

De form function is ideaal voor validatie en het werken met formulieren. Je kunt standaard validation schemas gebruiken zoals Zod, Valibot, etc.

```typescript
import { form } from '@sveltejs/kit';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  content: z.string().min(1)
});

export const createPost = form(createPostSchema, async (post) => {
  const user = requireAuth();

  await delay(300); // Voor loading spinner

  await db.insert(table.post).values({
    ...post,
    authorId: user.id
  });

  throw redirect(303, `/admin/edit/${post.slug}`);
});
```

### Form Gebruiken

```svelte
<script>
  import { createPost } from '$lib/api/post.remote';
</script>

<form {...createPost}>
  <input
    {...createPost.fields.title({ as: 'text' })}
    placeholder="Title"
  />
  {#each createPost.fields.title.issues() ?? [] as issue}
    <p class="issue">{issue.message}</p>
  {/each}

  <input
    {...createPost.fields.slug({ as: 'text' })}
    placeholder="Slug"
  />
  {#each createPost.fields.slug.issues() ?? [] as issue}
    <p class="issue">{issue.message}</p>
  {/each}

  <textarea
    {...createPost.fields.content({ as: 'textarea' })}
    placeholder="Content"
  />
  {#each createPost.fields.content.issues() ?? [] as issue}
    <p class="issue">{issue.message}</p>
  {/each}

  <button
    type="submit"
    aria-busy={!!createPost.pending}
  >
    Publish
  </button>
</form>
```

### Progressive Enhancement

Forms werken automatisch met progressive enhancement. Zelfs zonder JavaScript werkt het formulier via traditionele form submission.

### Form Enhancement Control

Je kunt het gedrag van forms controleren met de `enhance` method:

```svelte
<form
  {...updatePost}
  use:updatePost.enhance(({ data, form, submit }) => {
    submit(); // Gebruik JavaScript maar reset form niet
  })
>
  <!-- form fields -->
</form>
```

### Multiple Actions per Form

Je kunt verschillende actions op één form hebben:

```svelte
<form {...updatePost}>
  <!-- form fields -->

  <button type="submit">Update</button>
  <button {...removePost.buttonProps()}>Delete</button>
</form>
```

### Field Values Resetten

```svelte
<form
  {...postComment}
  use:postComment.enhance(({ submit }) => {
    submit();
    postComment.fields.comment.set(''); // Reset alleen comment field
  })
>
  <!-- fields -->
</form>
```

## Command Remote Function

Commands zijn voor situaties waar je data naar de server wilt schrijven maar geen form nodig hebt, zoals een like button.

```typescript
import { command } from '@sveltejs/kit';
import { z } from 'zod';
import { sql } from 'drizzle-orm';

export const likePost = command(z.number(), async (id) => {
  await delay(2000); // Simuleer vertraging

  await db
    .update(table.post)
    .set({ likes: sql`${table.post.likes} + 1` })
    .where(eq(table.post.id, id));
});
```

### Command Gebruiken

```svelte
<button onclick={() => likePost(post.id).refresh(getPostLikes(post.id))}>
  ❤️ {likes}
</button>
```

Commands vereisen expliciete refresh calls om gerelateerde queries te invalideren:

```typescript
likePost(post.id).refresh(getPostLikes(post.id))
```

### Optimistic UI Updates

Voor betere UX kun je optimistic updates toepassen:

```svelte
<button
  onclick={() => likePost(post.id)
    .updates(
      getPostLikes(post.id).withOverride((likes) => likes + 1)
    )
  }
>
  ❤️ {likes}
</button>
```

Dit update de UI onmiddellijk terwijl de server request in de achtergrond gebeurt. Bij een fout wordt de oude waarde hersteld.

## Authentication met Remote Functions

Je kunt een herbruikbare auth functie maken met `getRequestEvent`:

```typescript
import { getRequestEvent, redirect } from '@sveltejs/kit';

function requireAuth() {
  const { locals } = getRequestEvent();

  if (!locals.user) {
    throw redirect(307, '/auth/login');
  }

  return locals.user;
}

// Gebruik in queries
export const getAuthorPosts = query(async () => {
  const user = requireAuth(); // Redirect als niet ingelogd

  const posts = await db
    .select()
    .from(table.post)
    .where(eq(table.post.authorId, user.id));

  return posts;
});
```

Dit maakt routes automatisch protected. Als je het in een layout gebruikt, wordt de hele route tree beschermd.

## Authentication Example met Better Auth

```typescript
// lib/api/auth.remote.ts
import { form, redirect, getRequestEvent } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { signupSchema, loginSchema } from '$lib/schema/auth';

export const signup = form(signupSchema, async (user) => {
  await auth.api.signupEmail({
    body: user
  });

  throw redirect(307, '/admin');
});

export const login = form(loginSchema, async (user) => {
  const { request } = getRequestEvent();

  await auth.api.signInEmail({
    body: user,
    headers: request.headers
  });

  throw redirect(303, '/admin');
});

export const signout = form(async () => {
  const { request } = getRequestEvent();

  await auth.api.signOut({
    headers: request.headers
  });

  throw redirect(303, '/');
});

export const getUser = query(async () => {
  const { locals } = getRequestEvent();

  if (!locals.user) {
    throw redirect(307, '/auth/login');
  }

  return locals.user;
});
```

## CRUD Operations

### Create

```typescript
export const createPost = form(createPostSchema, async (post) => {
  const user = requireAuth();

  await db.insert(table.post).values({
    ...post,
    authorId: user.id
  });

  throw redirect(303, `/admin/edit/${post.slug}`);
});
```

### Read

```typescript
export const getPost = query(z.string(), async (slug) => {
  const [post] = await db
    .select()
    .from(table.post)
    .where(eq(table.post.slug, slug));

  if (!post) {
    throw error(404, 'Post not found');
  }

  return post;
});
```

### Update

```typescript
const updatePostSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  content: z.string()
});

export const updatePost = form(updatePostSchema, async ({ id, title, slug, content }) => {
  await db
    .update(table.post)
    .set({ title, slug, content })
    .where(eq(table.post.id, id));
});
```

### Delete

```typescript
export const removePost = form(updatePostSchema, async ({ id }) => {
  await db
    .delete(table.post)
    .where(eq(table.post.id, id));

  throw redirect(303, '/admin');
});
```

## Dynamic Routes met Parameters

```svelte
<script>
  import { derived } from 'svelte/store';
  import { getPost } from '$lib/api/post.remote';

  let { params } = $props();

  const post = derived(() => await getPost(params.slug));
</script>

<h1>{post.title}</h1>
<div>{@html post.content}</div>
```

De `derived` zorgt ervoor dat de post automatisch refetcht wanneer `params.slug` verandert.

## Hidden Fields Type-Safe

```svelte
<input
  {...updatePost.fields.id({
    as: 'hidden',
    value: post.id.toString()
  })}
/>
```

## Loading Indicators

```svelte
<button
  type="submit"
  aria-busy={!!createPost.pending}
>
  Publish
</button>
```

`pending` is een number die aangeeft hoeveel queries pending zijn. Gebruik `!!` om het naar boolean te converteren.

## Dedicated API Endpoints

Er zijn twee situaties waar je nog steeds dedicated API routes wilt maken:

### 1. Public API Endpoint

```typescript
// routes/api/posts/+server.ts
import { json } from '@sveltejs/kit';
import { getPosts } from '$lib/api/post.remote';

export async function GET() {
  const posts = await getPosts();
  return json(posts);
}
```

### 2. Custom Response (RSS Feed)

```typescript
// routes/rss.xml/+server.ts
import { getPosts } from '$lib/api/post.remote';

export async function GET() {
  const posts = await getPosts();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        ${posts.map(post => `
          <item>
            <title>${post.title}</title>
            <link>https://example.com/${post.slug}</link>
          </item>
        `).join('')}
      </channel>
    </rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml'
    }
  });
}
```

## Pre-render Function

Met de pre-render function kun je content pre-renderen zoals blog posts, terwijl je dynamische content op dezelfde pagina kunt hebben:

```typescript
import { prerender } from '@sveltejs/kit';

export const getBlogPost = prerender(async (slug) => {
  // Deze content wordt tijdens build time gegenereerd
  return await fetchBlogPost(slug);
});
```

## Validation Schema Libraries

Remote functions werken met elke validation library die de standard schema interface implementeert:

- Zod
- Valibot
- Yup
- And others

```typescript
import { z } from 'zod';
import { form } from '@sveltejs/kit';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const myForm = form(schema, async (data) => {
  // data is fully typed based on schema
});
```

## Server Side Rendering

Remote functions werken perfect met SSR. Bij de eerste page load wordt content server-side gerenderd:

```html
<!-- Initial HTML includes rendered content -->
<h1>My Post Title</h1>
<p>Post content here...</p>
```

Bij client-side navigatie worden remote functions als fetch requests uitgevoerd.

## Network Behavior

In de Network tab kun je zien dat remote functions gewoon API endpoints zijn die JSON retourneren:

```
POST /__data/posts.json
Response: {"posts": [...]}
```

SvelteKit blokkeert cross-site requests voor security.

## Experimentele Status

Remote functions zijn experimental. Gebruik op eigen risico. De API kan nog veranderen, vooral voor forms.

### Upcoming Changes

Button props worden waarschijnlijk vervangen door een type-safe API:

```svelte
<!-- Huidige API -->
<button {...register.buttonProps()}>Register</button>

<!-- Nieuwe API (in development) -->
<button {...register.fields.action({ as: 'submit', value: 'register' })}>
  Register
</button>
```

Dit elimineert de noodzaak voor meerdere form queries bij multiple actions.

### Toekomstige Features

Het SvelteKit team werkt aan:
- Streaming live data van de server
- Verbeterde form handling
- Meer optimalisaties

Lees altijd de officiële documentatie voor de laatste updates.

## Extracted Concepts

- **Remote Functions** — Experimentele SvelteKit feature om server functies als client functies aan te roepen
- **Query Function** — Remote function voor het lezen van data van de server
- **Form Function** — Remote function voor forms met automatische validatie
- **Command Function** — Remote function voor server writes zonder form
- **Progressive Enhancement** — Forms werken zonder JavaScript via traditional submission
- **Optimistic UI** — UI update onmiddellijk terwijl server request in achtergrond gebeurt
- **getRequestEvent** — Functie om current request object te krijgen in remote functions
- **requireAuth** — Herbruikbare auth functie die redirect bij niet-ingelogde gebruikers
- **Query Batching** — Meerdere queries samenvoegen tot single request (N+1 oplossing)
- **Field Validation** — Type-safe field validation met standard schema libraries
- **Pre-render Function** — Content pre-renderen tijdens build time

## 15 Google Analytics With Sveltekit

This module covers how to integrate Google Analytics 4 with SvelteKit applications, including setup, configuration, and implementation.

## Setting Up Google Analytics

### Finding the Documentation

Start by searching for the Google Analytics documentation. Navigate to **Set up Google Analytics** → **Website and web apps** → **Get started with Google Analytics** → **Set up analytics for a website or app**. This provides instructions with visual guides for the setup process.

### Key Concepts to Consider

Before setting up, think about what you want to achieve:

- **Step 1:** Get Google Analytics working
- **Step 2:** Decide what to measure (in this case, page views)

The documentation provides guidance on measuring page views and other metrics.

### Creating Your Analytics Account

1. Go to **analytics.google.com**
2. Navigate to **Admin** → **Create Account**
3. Enter an account name (e.g., "Example")
4. Configure data sharing settings (optional)
5. Click **Next**
6. Set up property details (name, currency, timezone)
7. Accept the terms of service
8. Click **Create**

### Setting Up Data Streams

Data streams are a Google Analytics 4 feature. To set up:

1. Go to **Properties** → **Data Streams** (located in the admin section)
2. Click **Add stream** → Select **Web**
3. Enter your website URL
4. Provide a stream name
5. Review tracked events (page views, scrolls, etc.)
6. Click **Create stream**

### Getting Your Measurement ID

After creating the data stream:

1. Navigate to **Data Streams**
2. Click on your stream
3. Find your **Measurement ID** (format: G-XXXXXXXXXX)
4. This ID is exposed to the client and required for integration
5. Review **Tagging instructions** for implementation guidance

## Implementing in SvelteKit

### Creating the Analytics Component

Create a reusable component to include in your layout:

**File:** `src/lib/Analytics.svelte`

```svelte
<script>
  import { page } from '$app/stores';

  $: {
    if (typeof gtag !== 'undefined') {
      gtag('config', 'G-XXXXXXXXXX', {
        page_title: document.title,
        page_path: $page.url.pathname
      });
    }
  }
</script>

<svelte:head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag('js', new Date());
  </script>
</svelte:head>
```

### Installing Type Definitions

Install TypeScript types for better development experience:

```bash
pnpm install -D @types/gtag.js
# or
npm install --save-dev @types/gtag.js
```

This provides autocomplete and type checking for the gtag API.

### Understanding the Reactive Block

The `$:` reactive statement reruns whenever `$page.url.pathname` changes, triggering Google Analytics to track page views on navigation.

### Checking for Window Context

```javascript
if (typeof gtag !== 'undefined') {
  // gtag code
}
```

This check is necessary because SvelteKit executes code in both server and client contexts. The condition prevents errors during server-side rendering where `window` is undefined.

### Including in Layout

Add the Analytics component to your root layout to track all pages:

**File:** `src/routes/__layout.svelte`

```svelte
<script>
  import Analytics from '$lib/Analytics.svelte';
</script>

<Analytics />

<slot />
```

The component auto-imports when you type its name (if using TypeScript/VSCode).

## JavaScript Functions as Objects

Brief explanation of how `gtag` works:

```javascript
function gtag() {
  console.log(arguments);
}

gtag.someProperty = 'value';
console.log(gtag); // Shows function properties
```

Functions in JavaScript are objects and can have properties. The `arguments` object inside functions captures all passed parameters, which is how `gtag` processes variable arguments.

## Testing the Implementation

### Starting the Development Server

```bash
npm run dev
```

Navigate to `localhost:3000` (or your configured port).

### Verifying the Installation

1. Open browser developer tools
2. Navigate to **Elements** → **Head**
3. Verify the Google Analytics script is present
4. Check the **Console** tab

### Ad Blocker Considerations

If using an ad blocker (e.g., browser extensions, Brave browser shields), you may see errors:

```
Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
```

This is expected behavior. Ad blockers prevent analytics scripts from loading. Users with ad blockers won't be tracked, and there's no workaround for this.

### Viewing Analytics Data

1. Go to **analytics.google.com**
2. Navigate to **Reports** → **Realtime**
3. Wait approximately 30 minutes for data to appear
4. View real-time visitors and page views

## Extracted Concepts

- **Google Analytics 4 (GA4)** — Latest version of Google Analytics with event-based tracking
- **Measurement ID** — Unique identifier for your GA4 property (format: G-XXXXXXXXXX)
- **Data Streams** — GA4 feature that defines data sources from websites or apps
- **gtag.js** — Global site tag JavaScript library for Google Analytics
- **Reactive Statements (`$:`)** — Svelte feature that reruns code when dependencies change
- **Server-Side Rendering (SSR)** — SvelteKit executes code on both server and client
- **svelte:head** — Svelte element for adding content to document head
- **$app/stores** — SvelteKit stores providing page context and navigation state

## 16 Learn Sveltekit Hooks Through 6 Examples

SvelteKit hooks are middleware-like functions that can attach themselves to events and trigger behavior based on those events. Think of hooks as a way to intercept requests between the client and server, allowing you to modify requests and responses.

## What Are Hooks?

When a client sends a request to the server, hooks let you intercept that request before it reaches its destination. You can use hooks for:

- **Authentication** - Verify user credentials and populate user data
- **Response modification** - Transform HTML or add headers
- **Error and performance logging** - Track issues and measure page load speed
- **Automatic route creation** - Generate routes programmatically
- **Internationalization** - Dynamically set language attributes

SvelteKit uses a special hooks file that can run on the client or server. It provides server hooks like `handle` and `handleFetch`, and shared hooks like `handleError`.

## Hook Files

| File | Purpose |
|------|---------|
| `hooks.server.ts` | Server-side hooks (handle, handleFetch, handleError) |
| `hooks.client.ts` | Client-side hooks (handleError) |

## Example 1: The Handle Hook

The `handle` hook runs each time the SvelteKit server receives a request and determines the response.

**Creating the hooks file:**

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  return await resolve(event);
};
```

This is the default behavior - it simply resolves the event and returns the response.

**Changing the default behavior:**

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  return new Response('🍌 banana');
};
```

Now every route returns a banana emoji, even routes that don't exist (which would normally return 404).

**Targeting specific routes:**

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith('/banana')) {
    return new Response('🍌 banana');
  }

  return await resolve(event);
};
```

This creates a route through code - when users visit `/banana`, they get the banana response. Other routes work normally.

## Example 2: Authentication Flow

Hooks are commonly used for authentication. Here's how the flow works:

1. User submits login form at `/login`
2. Server authenticates and sets a session cookie
3. Handle hook reads the cookie and populates user data

**Populating user data in hooks:**

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const session = event.cookies.get('session');

  if (session) {
    const user = await getUser(session);
    event.locals.user = user;
  }

  return await resolve(event);
};
```

The `event.locals` object passes extra data to requests throughout your application.

**Accessing user data in endpoints:**

```typescript
// src/routes/user/+server.ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  return new Response(JSON.stringify(locals.user));
};
```

**Accessing user data in layouts:**

```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user
  };
};
```

Data returned from the layout load function gets merged with data in child routes and becomes available in the `page.data` store.

**Using user data in pages:**

```svelte
<script>
  import { page } from '$app/stores';
</script>

{#if $page.data.user}
  <p>Welcome {$page.data.user}</p>
{/if}
```

This runs on every request to authenticate the user and update the page data automatically.

## Example 3: Transforming HTML

You can use hooks to transform HTML, which is useful for internationalization. For example, you might need to change the language attribute based on user preferences.

**Setting a placeholder in app.html:**

```html
<!-- src/app.html -->
<html lang="%lang%">
```

**Replacing the placeholder in hooks:**

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const locale = event.cookies.get('locale') || 'hr'; // Croatian
  event.locals.locale = locale;

  return await resolve(event, {
    transformPageChunk: ({ html }) => {
      return html.replace('%lang%', locale);
    }
  });
};
```

The `transformPageChunk` function gives you the HTML of the request as a string, allowing you to perform replacements. The language attribute now updates dynamically based on the locale.

## Example 4: Measuring Page Load Speed

Hooks are useful for performance monitoring and error logging.

**Measuring response time:**

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const route = event.url.pathname;

  const start = performance.now();
  const response = await resolve(event);
  const end = performance.now();

  const responseTime = end - start;

  if (responseTime > 2000) {
    console.log(`🐢 ${route} took ${responseTime.toFixed(2)} milliseconds`);
  }

  if (responseTime < 1000) {
    console.log(`🚀 ${route} took ${responseTime.toFixed(2)} milliseconds`);
  }

  return response;
};
```

This logs a turtle emoji for slow routes (over 2 seconds) and a rocket for fast routes (under 1 second), helping you identify performance issues during development.

## Example 5: Error Handling

The `handleError` hook runs when an unexpected error occurs during loading or rendering. This is useful for error reporting to services like Sentry or LogRocket.

**Using handleError:**

```typescript
// src/hooks.server.ts
import type { HandleServerError } from '@sveltejs/kit';

export const handleError: HandleServerError = async ({ error, event }) => {
  console.log(error); // Full stack trace available

  return {
    message: '😱 Yikes!'
  };
};
```

SvelteKit normally strips unexpected error messages and stack traces for security. The `handleError` hook lets you:

- Log the full error with stack trace
- Send errors to monitoring services
- Customize the error message returned to users
- Access error data in your error page via `page.data`

The returned message becomes part of your page data store, allowing you to customize error pages.

## Example 6: Modifying Fetch Requests

The `handleFetch` hook modifies fetch requests inside load or action functions that run on the server.

**Upgrading HTTP to HTTPS:**

```typescript
import type { HandleFetch } from '@sveltejs/kit';

export const handleFetch: HandleFetch = async ({ request, fetch }) => {
  if (request.url.startsWith('http://')) {
    const url = request.url.replace('http://', 'https://');
    request = new Request(url, request);
    console.log(request.url); // Logs the updated URL
  }

  return await fetch(request);
};
```

This automatically upgrades insecure HTTP requests to HTTPS, ensuring secure connections.

## Bonus Example: Parsing Form Data

Working with forms requires getting form data, validating it, and looping over fields before passing to validation libraries like Zod. You can automate this with a hook.

**Installing the library:**

```bash
npm install parse-nested-form-data
```

**Parsing form data in hooks:**

```typescript
import { parseFormData } from 'parse-nested-form-data';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.request.method === 'POST') {
    const formData = await event.request.formData();
    const data = parseFormData(formData);
    event.locals.formData = data;
  }

  return await resolve(event);
};
```

**Accessing parsed data in actions:**

```typescript
// src/routes/+page.server.ts
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ locals }) => {
    console.log(locals.formData);
    // { username: 'test', password: '1234', remember: true }
  }
};
```

The library automatically converts form values. For example, using `&` in the field name converts checkboxes to booleans:

```html
<input type="checkbox" name="remember&" />
```

This converts `remember: "on"` to `remember: true`.

**Typing locals for TypeScript:**

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      formData?: Record<string, any>;
    }
  }
}
```

## Using Multiple Hooks Together

When using multiple hooks from different libraries, use the `sequence` helper function.

```typescript
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';

async function authHook({ event, resolve }) {
  console.log('auth hook');
  return await resolve(event);
}

async function i18nHook({ event, resolve }) {
  console.log('i18n hook');
  return await resolve(event);
}

export const handle = sequence(authHook, i18nHook);
```

The `sequence` function chains hooks together, running them in order. This lets you save hooks for later and reuse them across projects.

## Extracted Concepts

- **Handle hook** — Runs on every server request, allowing you to modify requests and responses
- **event object** — Contains cookies, fetch, URL, locals, and other request data
- **event.locals** — Object for passing custom data from hooks to endpoints and load functions
- **transformPageChunk** — Function that transforms HTML as a string before sending to client
- **handleError** — Shared hook for logging unexpected errors with full stack traces
- **handleFetch** — Server hook for modifying fetch requests in load/action functions
- **sequence** — Helper function for chaining multiple hooks together
- **resolve** — Function that generates the response for a request

## 17 Using Websockets With Sveltekit

This tutorial covers how to integrate WebSockets with SvelteKit, both in development and production environments. While this is not a general WebSockets tutorial, it focuses specifically on making WebSockets work within a SvelteKit project.

## Use Case Example

The tutorial demonstrates a live preview editor for Markdown content where:
- Left side: Editor input
- Right side: Live preview via WebSocket connection
- Content gets sent to the server, processed through a markdown chain, and updates appear in real-time

Common use cases include multiplayer games, real-time collaboration tools, and live preview systems.

## Current WebSocket Support in SvelteKit

SvelteKit does not currently have native WebSocket support. The anticipated API might look like this:

```typescript
export const websocket = {
  // Future potential API
}
```

However, this doesn't exist yet. You can follow the discussion on GitHub for updates.

## Solution Approaches

**Option 1**: Create a separate server (requires running two services on different ports)

**Option 2**: Integrate WebSockets into SvelteKit using a Vite plugin (recommended approach shown in this tutorial)

## Development Setup

### Required Dependencies

1. **socket.io** - WebSocket library that handles connection complexity
2. **@sveltejs/adapter-node** - Required for production builds

### Configuration Changes

First, update your `svelte.config.js` to use the Node adapter:

```javascript
import { adapter } from '@sveltejs/adapter-node';
import { Server } from 'socket.io';

export const websocketServer = {
  name: 'socket-server',
  configureServer(server) {
    const io = new Server(server.httpServer);

    io.on('connection', (socket) => {
      socket.emit('event-from-server', 'Hello World 👋');
    });
  }
};

export default {
  kit: {
    adapter: node() // Changed from adapter-auto
  },
  plugins: [websocketServer]
};
```

The Vite plugin hooks into the development server's HTTP server and creates the WebSocket connection. Despite appearances, there's actually more socket.io code than Vite configuration code.

### Client-Side Implementation

In your Svelte component (e.g., `src/routes/+page.svelte`):

```svelte
<script lang="ts">
  import { io } from 'socket.io-client';

  const socket = io();

  socket.on('event-from-server', (message) => {
    console.log(message);
  });
</script>
```

### Testing Development Setup

After adding the plugin, restart your development server:

```bash
npm run dev
```

You should see "Hello World 👋" logged in the browser console.

### Reactive Updates

To emit data when values change, use Svelte's reactive blocks:

```svelte
<script lang="ts">
  let message = $state('');

  $effect(() => {
    socket.emit('message-to-server', message);
  });
</script>
```

## Production Setup

Production requires a custom Express server because the Node adapter generates a handler that needs to be integrated with WebSocket support.

### Build Output

Running `npm run build` creates:
- `build/` folder
- `build/index.js`
- `build/handler.js` - The SvelteKit request handler

### Custom Server Implementation

Create `server/index.js` at the project root:

```javascript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from '../build/handler.js';

const port = 3000;
const app = express();
const server = createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  socket.emit('event-from-server', 'Hello World 👋');
});

// SvelteKit handles all routing via middleware
app.use(handler);

server.listen(port);
```

**How it works:**
1. Express creates the base server
2. Socket.io attaches to the HTTP server
3. SvelteKit's handler is used as Express middleware
4. SvelteKit takes care of all routing and rendering
5. The middleware intercepts requests/responses, letting SvelteKit handle everything

### Package.json Script

Add a start script to `package.json`:

```json
{
  "scripts": {
    "start": "node server/index.js"
  }
}
```

### Running in Production

Instead of the default SvelteKit server:

```bash
npm start
```

This starts both the SvelteKit application and WebSocket server together on the same port.

## Key Takeaways

- **Development**: Use a Vite plugin to hook into the dev server
- **Production**: Use adapter-node with a custom Express server
- **Why Node adapter?**: It generates a handler.js that can be used as Express middleware
- **No separate servers**: Everything runs on one port
- **SvelteKit handles routing**: The handler middleware lets SvelteKit manage all requests

## Additional Resources

For environment variables in SvelteKit, refer to the separate tutorial on that topic.

## 18 What'S New In Sveltekit 2 Shallow Routing

SvelteKit 2.0 has been released with no major breaking API changes. The main reason for the version bump is the upgrade to Vite 5. Vite is one of the backbones of every modern JavaScript framework today, used by Astro, Nuxt, SvelteKit, SolidStart, Qwik City, Redwood JS, and Remix.

## Release Notes Overview

For most users, upgrading to SvelteKit 2 will be painless because there are no major breaking API changes. Run the automatic migration script:

```bash
npx sv-migrate sveltekit-2
```

### Breaking Changes

**Error and Redirect Handling**

`redirect` and `error` are no longer thrown by you. Previously you had to use `throw error()`, which was confusing. Now you can just call `error()` directly.

Helper functions available:
- `isHttpError` - Check if error is HTTP error
- `isRedirect` - Check if error is redirect

If the error or redirect is thrown inside a try-catch block, you can use these helpers from `@sveltejs/kit`.

**Cookie Path Required**

When setting a cookie, you must now always set the path.

**Top-level Promises**

Top-level promises are no longer awaited automatically. In SvelteKit 1, if the top-level properties of the object returned from a load function were promises, they were automatically awaited. SvelteKit 2 no longer differentiates between top-level and non-top-level promises.

You can use blocking fetch by using `await` for a single promise, or `await Promise.all()` for multiple promises.

**Goto Function Changes**

`goto` no longer accepts external URLs. To navigate to an external URL, use the `window.location` API.

**Paths Are Relative by Default**

Paths are now relative by default. Review your code if this affects your routing.

### Other Changes

- Server features are not trackable anymore
- Preload code arguments must be prefixed with base
- `resolvePath` has been removed
- Improved error handling
- Dynamic environment variables cannot be used during pre-rendering. Use static modules instead.

**Form Enhancement Callback Changes**

Renamed parameters in the `use:enhance` callback:
- `form` → `formElement`
- `data` → `formData`

This change improves consistency and clarity.

**Form File Input Requirements**

Forms containing file inputs must use multipart form data.

**Dependencies Upgraded**

Multiple dependencies have been upgraded as part of the Vite 5 migration.

## Shallow Routing

Shallow routing allows you to create Instagram-like experiences in your app. You can update the URL and create history entries without performing a full navigation.

### What is Shallow Routing?

Shallow routing means you can change the URL in the browser and open content in a modal, then go back to where you were without doing a navigation. This is the same experience as Instagram - when you click on an image, it changes the URL and opens a modal with comments and likes. When you close the modal, you return to your previous location.

### Why Use Shallow Routing?

Sometimes it's useful to create history entries without navigating. You might want to show a modal dialogue that the user can dismiss by navigating back. This is particularly valuable on mobile devices where swipe gestures are often more natural than interacting directly with the UI.

### API Functions

SvelteKit provides two functions for shallow routing:

- **`pushState(url, state)`** - Create a new history entry with custom state
- **`replaceState(url, state)`** - Replace current history entry

### Basic Example

```javascript
// Open modal with push state
pushState('', { showModal: true });

// Access state in page store
$page.state.showModal

// Close modal - user returns to where they started
history.back()
```

The state you pass becomes available under `page.state` in your page store.

## Implementation Example

This example demonstrates creating an Instagram-like image feed with modal views.

### Project Structure

**API Endpoint** (`/api/images`)

Returns JSON array of 20 images using the Picsum API:

```typescript
// +server.ts
export async function GET() {
  const images = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    source: `https://picsum.photos/seed/${i}/400/300`,
    alt: `Image ${i + 1}`
  }));
  return json(images);
}
```

**Feed Page** (`/routes/+page.server.ts`)

Fetch images and return as props:

```typescript
export async function load({ fetch }) {
  const response = await fetch('/api/images');
  const thumbnails = await response.json();
  return { thumbnails };
}
```

**Detail Page** (`/routes/photos/[id]/+page.server.ts`)

Filter specific image by ID:

```typescript
export async function load({ params, fetch }) {
  const id = params.id;
  const response = await fetch('/api/images');
  const images = await response.json();
  const image = images.find(img => img.id === parseInt(id));
  return { image };
}
```

### Feed Component with Shallow Routing

**Template**

```svelte
<script lang="ts">
  import { goto, preloadData, pushState } from '$app/navigation';
  import { page } from '$app/stores';
  import Modal from './Modal.svelte';
  import Image from './photos/[id]/+page.svelte';

  export let data;

  let modal: HTMLDialogElement;

  async function showModal(e: Event) {
    e.preventDefault();

    // Get URL from clicked link
    const { href } = e.currentTarget as HTMLAnchorElement;

    // Get result of load function
    const result = await preloadData(href);

    // Create new history entry
    if (result.type === 'loaded' && result.status === 200) {
      pushState(href, { selected: result.data });
      modal?.showModal();
    } else {
      // Navigate if something goes wrong
      goto(href);
    }
  }

  function closeModal() {
    history.back();
  }
</script>

{#each data.thumbnails as { id, source, alt }}
  <a href="/photos/{id}" on:click={showModal}>
    <img {src} {alt} />
  </a>
{/each}

<Modal bind:modal on:close={closeModal}>
  {#if $page.state.selected}
    <Image data={$page.state.selected} />
  {/if}
</Modal>
```

### Key Implementation Details

**Prevent Default Navigation**

```javascript
async function showModal(e: Event) {
  e.preventDefault();
  // ...
}
```

**Get Load Function Data Programmatically**

Use `preloadData()` to get the data from the load function without navigating:

```javascript
const result = await preloadData(href);
```

This returns an object with:
- `type`: "loaded"
- `status`: HTTP status code
- `data`: The data from the load function

**Create History Entry**

```javascript
if (result.type === 'loaded' && result.status === 200) {
  pushState(href, { selected: result.data });
  modal?.showModal();
}
```

**Reuse Page Components**

You can import and use page components like regular Svelte components:

```svelte
import Image from './photos/[id]/+page.svelte';

<Image data={$page.state.selected} />
```

This works because pages in SvelteKit are just Svelte components. The component expects `export let data` as a prop, which you provide from `$page.state.selected`.

**Close Modal**

```javascript
function closeModal() {
  history.back();
}
```

When using the dialog element, users can also press Escape to close the modal, which automatically triggers the close event.

### Type Safety

Make `page.state` type-safe by declaring an `App.PageState` interface in `src/app.d.ts`:

```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface PageState {
      selected?: {
        image: {
          id: number;
          source: string;
          alt: string;
        }
      }
    }
  }
}

export {};
```

## Extracted Concepts

- **Shallow Routing** — Updating URL and creating history entries without full page navigation
- **pushState(url, state)** — Create new history entry with custom state data
- **replaceState(url, state)** — Replace current history entry with new state
- **preloadData(url)** — Programmatically get data from load function without navigation
- **page.state** — Store containing custom state data from push/replace state
- **Dialog Element** — Native HTML element for modals with built-in Escape key handling
- **Vite 5** — Build tool and dev server used by modern JavaScript frameworks
- **SvelteKit Pages as Components** — Pages can be imported and used like regular Svelte components
