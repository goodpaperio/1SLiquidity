
We aim to calculate a **sweetSpot** that depends on two reserves:

- **ReserveIn**: what we add  
- **ReserveOut**: what was already there

In the “old” approach, we cap this sweetSpot at **500**. To avoid a hard plateau at 500, we introduce a **second** formula and switch to it when needed.

---

## 1. Old formula (with 500 cap)

- As long as **ReserveIn** is not much larger than **ReserveOut**, your sweetSpot **grows** normally.  
- If **ReserveIn** becomes very large, the formula would exceed **500**, so we “stop” it at 500.  
- Result: beyond a certain ReserveIn/ReserveOut ratio, you always get **sweetSpot = 500**, no matter how much further you increase **ReserveIn**.

👍 **Good**: simple and accurate up to the cap.  
👎 **Bad**: introduces a **hard plateau** at 500.

---

## 2. New formula (no cap)

- For very large **ReserveIn**, we want a value that **decreases** gradually as **ReserveIn** grows, instead of staying stuck.  
- This second formula has **no 500 ceiling**: as **ReserveIn** increases, the sweetSpot **goes down**.

👍 **Good**: no more plateau, a smooth descent.  
👍 No fixed “500”—it follows a continuous slope.

---

## 3. When to switch formulas?

1. **If ReserveIn ≤ ReserveOut**  
   - Stay on the **old** formula.  
2. **If ReserveIn > ReserveOut**  
   - Check whether the old formula would exceed **500**:  
     - If **no**, continue with the old formula.  
     - If **yes**, **switch** to the new formula (so the value decreases instead of staying at 500).

> **Rule:**  
> As soon as **ReserveIn** exceeds **ReserveOut** _and_ the old formula would give more than **500**, switch to the new formula.

---

## 4. Concrete example

- **ReserveOut** = 100  
- When **ReserveIn** = 500 000 (very large):  
  1. **Old formula** → huge result → capped at **500**.  
  2. **New formula** → uncapped result → drops to **~7**.  

Instead of staying stuck at 500, it falls to around 7 thanks to the second formula.

---

## 5. Why this mechanism

- **Old formula**: reliable until you hit the ceiling, but creates a “wall” at **500**.  
- **New formula**: removes the wall, gradually bringing the sweetSpot down for very large inputs.  
- **Automatic switch**: we use rule 3 above to simply pick the right formula each time.

**Outcome:**  
1. Growing behavior up to the threshold  
2. Decreasing behavior beyond it  

→ Avoids getting stuck at **500**.


5 500000
1 BTC what happens?