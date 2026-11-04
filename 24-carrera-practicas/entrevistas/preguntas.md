# ML Engineer interview question bank (English)

Answer **out loud in English**, 1-2 minutes each, then compare with `respuestas.md`. Ideal: one mock interview a week with Claude (*"Interview me as a ML engineer interviewer, one question at a time, push back on vague answers"*).

## A · ML fundamentals
1. Explain the bias-variance trade-off. How would you diagnose which one is hurting your model?
2. Why do we use a validation set *and* a test set? What is data leakage? Give two realistic examples.
3. Why does logistic regression use cross-entropy instead of mean squared error?
4. What does L2 regularisation do to the weights, and how is it different from L1?
5. Your classifier has 99 % accuracy on a fraud dataset. Is it good? Which metrics would you look at?
6. How does gradient descent change when features have very different scales?
7. Explain precision, recall and when you would optimise each.
8. What is cross-validation and when would you **not** use random K-fold?

## B · Deep learning
9. Why do deep networks need non-linear activations? Compare ReLU and sigmoid.
10. What are vanishing and exploding gradients, and three ways to deal with them?
11. Explain batch normalisation and what changes between training and inference.
12. What is dropout and why does it help?
13. How does a convolution reduce the number of parameters compared with a dense layer?
14. Explain self-attention in your own words. Why is it O(n²) in sequence length?
15. Adam vs SGD with momentum: trade-offs?
16. Your training loss goes down but validation loss goes up after epoch 5. What do you do?

## C · Applied / your projects
17. Walk me through your F1 project: question, data cleaning decisions, result, limitations.
18. You built a neural surrogate for an aerodynamic solver. How did you make sure the test error was honest? (*hint: split by airfoil*)
19. A linear model almost matched your neural network. What does that tell you?
20. How would you detect ships in SAR images, and how would you evaluate the detector?
21. How would you deploy a model that must answer in < 10 ms?

## D · ML system design
22. Design a system that predicts tyre degradation during a race in real time.
23. Design a pipeline that flags "dark vessels" from daily satellite images.
24. How would you monitor a model in production? What is data drift vs concept drift?

## E · Coding (Python / NumPy, whiteboard style)
25. Implement softmax in NumPy in a numerically stable way.
26. Implement mini-batch gradient descent for linear regression (vectorised).
27. Given a list of lap times with NaNs, return the rolling median of the last 5 valid laps.
28. Implement k-means (just the loop) in NumPy.

## F · Behavioural (STAR: Situation, Task, Action, Result)
29. Tell me about a hard problem you solved that took weeks.
30. Tell me about a time you failed and what you changed afterwards.
31. Why ML engineering and not data science or software engineering?
32. Why our company? (prepare one per target company)
