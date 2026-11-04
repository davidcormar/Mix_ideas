# Answer outlines (look only after answering out loud)

**1.** Bias = error from too-simple assumptions (underfit: high train and val error). Variance = sensitivity to the training set (overfit: low train, high val). Diagnose with learning curves / train vs val gap. Fix bias: bigger model, better features, less regularisation. Fix variance: more data, regularisation, simpler model, augmentation.

**2.** Validation chooses hyper-parameters; test is touched once for an unbiased final estimate. Leakage = information unavailable at prediction time leaks into training. Examples: normalising with statistics of the whole dataset; random split of time series (future in train); same airfoil/patient in train and test.

**3.** With a sigmoid, MSE gives a non-convex cost with flat regions (vanishing gradients when wrong and confident). Cross-entropy is the negative log-likelihood of a Bernoulli model → convex in the weights and gradient = (prediction − label)·x.

**4.** L2 adds λ‖w‖² → shrinks all weights smoothly ("weight decay"), keeps all features. L1 adds λ‖w‖₁ → pushes some weights exactly to zero (sparsity / feature selection).

**5.** Not necessarily: with 1 % fraud, predicting "no fraud" always gives 99 %. Look at precision, recall, F1, PR-AUC, confusion matrix, and the business cost of each error.

**6.** Elongated contours → zig-zag and tiny learning rate needed. Standardise features (z-score with train stats) so one learning rate works for all directions.

**7.** Precision = TP/(TP+FP): when false alarms are costly (spam filter). Recall = TP/(TP+FN): when misses are costly (cancer screening, dark vessels). Choose with the threshold / PR curve.

**8.** K-fold averages performance over K train/val splits. Don't use random K-fold for time series (use forward chaining) or grouped data (use GroupKFold).

**9.** Without non-linearities a deep net collapses to one linear map. Sigmoid saturates (gradients ≈ 0) and is not zero-centred; ReLU is cheap and doesn't saturate for x>0 but can "die".

**10.** Gradients shrink/grow exponentially through layers. Fixes: good initialisation (He/Xavier), ReLU-family activations, normalisation layers, residual connections, gradient clipping.

**11.** Normalises activations per mini-batch then learns scale/shift; stabilises and speeds up training. At inference it uses running averages of mean/variance, not batch statistics (so `model.eval()` matters).

**12.** Randomly zeroes activations during training → prevents co-adaptation, acts like an ensemble. Disabled at inference (with rescaling).

**13.** Weight sharing and local connectivity: a 3×3 kernel has 9·C_in·C_out weights regardless of image size; a dense layer has (H·W·C_in)·units.

**14.** Each token builds a query; compares it with every token's key (dot product) → weights via softmax → weighted sum of values. Every pair is compared → n² scores.

**15.** Adam adapts per-parameter step sizes → fast, robust default. SGD + momentum often generalises slightly better in vision with a good schedule; needs more tuning.

**16.** Overfitting: early stopping, more data/augmentation, regularisation (weight decay, dropout), smaller model; check for leakage or a distribution shift between train and val.

**17-21.** Use your real projects: question → data → method → number → limitation → what you'd do next. For 18: GroupShuffleSplit by airfoil. For 19: the problem is near-linear (thin airfoil theory) — the value of the NN appears with viscous/separated flows. For 21: smaller model, quantisation, batching, ONNX/TensorRT, cache, measure p99 not mean.

**22-24.** Structure: requirements (latency, accuracy, data) → data sources → features → baseline → model → evaluation offline/online → deployment → monitoring (data drift = inputs change; concept drift = input→output relation changes) → retraining.

**25.** `z = x - x.max(axis=-1, keepdims=True); e = np.exp(z); return e / e.sum(axis=-1, keepdims=True)`

**26.** Shuffle indices each epoch; for each batch `err = Xb @ w + b - yb; w -= lr * Xb.T @ err / len(yb); b -= lr * err.mean()`.

**27.** Drop NaNs keeping order, then `pd.Series(valid).rolling(5, min_periods=1).median()`; mention edge cases.

**28.** Init k centroids from data; loop: assign = argmin of pairwise distances; update centroid = mean of assigned points (handle empty clusters); stop when assignments don't change.

**29-32.** Prepare 4-5 STAR stories from: the F1 project, learning French to B2 while abroad, the 5K progress with data (27:58 → 26:47), the project with your teammate, the exchange in India.
