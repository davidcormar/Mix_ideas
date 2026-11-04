# Quick test (subtle options, all plausible) — answers at the bottom

**Q1.** You standardise features before a train/test split, using the mean and std of the full dataset. What is the main problem?
A) The model will underfit because features lose their scale
B) Test-set statistics leak into training, making the evaluation optimistic
C) Gradient descent will diverge because the variance is now 1
D) Nothing, as long as the same transformation is applied to both splits

**Q2.** Training loss decreases steadily; validation loss decreases, then rises from epoch 8. Which action does **not** address the cause?
A) Early stopping around epoch 8
B) Increasing weight decay
C) Increasing the learning rate to converge faster
D) Adding data augmentation

**Q3.** In logistic regression, the gradient of the cross-entropy cost w.r.t. w_j is
A) (1/m) Σ (σ(z) − y) x_j
B) (1/m) Σ (σ(z) − y) σ(z)(1 − σ(z)) x_j
C) (1/m) Σ (y − σ(z)) x_j
D) (1/2m) Σ (σ(z) − y)² x_j

**Q4.** A model detects dark vessels. Missing a vessel is far worse than a false alarm. You should prioritise
A) Precision, keeping the 0.5 threshold
B) Recall, lowering the decision threshold
C) Accuracy, because classes are balanced after filtering
D) Recall, raising the decision threshold

**Q5.** Batch normalisation at inference time uses
A) The statistics of the current batch
B) The running mean/variance estimated during training
C) The statistics of the test set computed once
D) No normalisation; it is only active during training

**Q6.** Why can a random K-fold be misleading for lap-time prediction across a season?
A) Because K-fold needs at least 10 folds to be unbiased
B) Because laps from the same race in train and validation share conditions, inflating the score
C) Because K-fold cannot be used with regression targets
D) Because lap times are not normally distributed

**Q7.** L1 regularisation tends to produce sparse weights because
A) Its gradient is proportional to the weight, so small weights shrink faster
B) Its penalty has a constant-magnitude gradient that can push small weights exactly to zero
C) It squares the weights, amplifying large ones
D) It is only applied to the bias term

**Q8.** Self-attention cost grows quadratically with sequence length because
A) Each layer has n² parameters
B) Every token's query is compared with every token's key
C) Softmax is O(n²) for a vector of length n
D) Positional encodings require an n×n matrix of parameters

---
**Answers:** 1-B · 2-C · 3-A · 4-B · 5-B · 6-B · 7-B · 8-B
- 1: D is the trap — "same transformation" is right, but it must be **fitted on train only**.
- 3: B is the MSE-with-sigmoid gradient; C has the wrong sign; D is a cost, not a gradient.
- 4: D lowers recall (raising the threshold flags fewer cases).
- 8: A is wrong — attention weights don't depend on n; the **score matrix** does.
