import { For, onCleanup, onMount, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";

const operators = ["+", "-", "*", "/", "%"] as const;
type Operator = (typeof operators)[number];
function isOperator(value: any): value is Operator {
  return operators.includes(value);
}

interface Payload {
  push: number | ".";
  clear: void;
  op: Operator;
  resolve: void;
}

type Action = {
  [Key in keyof Payload]: {
    type: Key;
    payload: Payload[Key];
  };
}[keyof Payload];

const actions = new Proxy(
  {},
  {
    get(_, p) {
      const fn = (payload: any) => ({ type: p, payload });
      fn.type = p;
      fn.toString = () => p;
      return fn;
    },
  },
) as {
  [Key in keyof Payload]: { type: Key } & ((payload: Payload[Key]) => {
    type: Key;
    payload: Payload[Key];
  });
};

type State = {
  value: number;
  prev: undefined | number;
  op: undefined | Operator;
};
export default function App() {
  const numbers = Array(10)
    .fill(undefined)
    .map((_, n) => n)
    .slice(1);
  const [state, setState] = createStore<State>({
    value: 0.0,
    prev: undefined,
    op: undefined,
  });

  function dispatch(action: Action): void {
    switch (action.type) {
      case actions.push.type:
        setState(
          produce((state) => {
            let value = `${state.value}${action.payload}`;
            console.debug({ action, value });
            state.value = parseFloat(value);
          }),
        );
        break;
      case actions.clear.type:
        setState(
          produce((state) => {
            state.value = 0;
            state.prev = undefined;
            state.op = undefined;
          }),
        );
        break;
      case actions.op.type:
        setState(
          produce((state) => {
            state.op = action.payload;
            state.prev = state.value;
            state.value = 0;
          }),
        );
        break;
      case actions.resolve.type:
        setState(
          produce((state) => {
            if ([state.prev, state.op].includes(undefined)) return;

            state.value = eval(`${state.prev} ${state.op} ${state.value}`);
            state.prev = undefined;
            state.op = undefined;
          }),
        );
    }
  }

  onMount(() => {
    const keypress = ({ key }: KeyboardEvent) => {
      console.debug({ key });
      const n = parseInt(key);
      if (!isNaN(n)) dispatch(actions.push(n));
      if (key === ".") dispatch(actions.push(key));
      if (isOperator(key)) dispatch(actions.op(key));
      if (key === "Enter") dispatch(actions.resolve());
    };

    window.addEventListener("keypress", keypress);
    onCleanup(() => {
      window.removeEventListener("keypress", keypress);
    });
  });

  return (
    <main>
      <section>
        <Show when={state.prev !== undefined}>
          <output>{state.prev}</output>
        </Show>
        <Show when={state.op !== undefined}>
          <output>{state.op}</output>
        </Show>
        <output>{state.value}</output>
      </section>
      <section>
        <ol>
          <For each={numbers}>
            {(number) => (
              <li>
                <button onClick={() => dispatch(actions.push(number))}>
                  {number}
                </button>
              </li>
            )}
          </For>
          <li>
            <button onClick={[dispatch, actions.push(0)]}>0</button>
          </li>
          <li>
            <button onClick={[dispatch, actions.push(".")]}>.</button>
          </li>
          <li>
            <button onClick={[dispatch, actions.clear()]}>C</button>
          </li>
        </ol>
        <br />
        <ol>
          <For each={operators}>
            {(op) => (
              <li>
                <button onClick={[dispatch, actions.op(op)]}>{op}</button>
              </li>
            )}
          </For>
          <li>
            <button onClick={[dispatch, actions.resolve()]}>=</button>
          </li>
        </ol>
      </section>
      <section></section>
    </main>
  );
}
