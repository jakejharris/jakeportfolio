# Compression as Intelligence: A Recursive Architecture for Reasoning Over Everything

What running agent swarms on real codebases taught me about the biggest bottleneck in AI, and a proposal for fixing it.

---

I didn't arrive at this idea through a literature review. I arrived at it by watching Claude Code choke on a 3,000-line file.

I've spent the last several months building agentic workflows for enterprise codebases at my day job. Agent teams, sub-agent hierarchies, MCP servers pulling context from Jira and GitHub and Kusto and feeding it to a frontier model. The practical stuff. And the single lesson that keeps surfacing, across every tool and every project, is this: **context is the bottleneck, not intelligence.**

The models are smart enough. They've been smart enough for a while. What kills them is noise. Copy-paste a 500-line error log into Claude and ask it to debug, and it performs measurably worse than if you `grep` for the relevant 15 lines and paste only those. Fill a context window with irrelevant code and the model loses track of what you actually asked about. Every practitioner knows this intuitively. The research confirms it: Microsoft's LLMLingua showed that compressing input prompts by 4x actually *improved* performance by 21.4% on QA tasks. Less input. Better output. The compression strips noise from the positions the model attends to most effectively.

I stopped calling it "prompt engineering" a while ago. The prompt is rarely the problem. The context is. So I started calling it context engineering, and then I started wondering what happens when you take that idea as far as it can go.

## What I Learned Running Three-Tier Agent Hierarchies

Here's the architecture I converged on after iterating through dozens of agent team sessions:

```
Me (human) <-> Lead Architect (Opus, coordinator)
                    |
              Teammates (Opus/Sonnet, workers)
                    |
              Explore sub-agents (Haiku, readers)
```

Three tiers. The expensive frontier model coordinates and reasons. Mid-tier models implement. Cheap, fast models do all the reading and exploration. Every tier compresses information for the tier above it. And the rules I learned the hard way are the ones nobody writes down in the documentation:

**Sub-agents return references, not content.** A Haiku explore agent responds with `src/models/user.py:142: def process_data(input_data)`, not the full file. The reasoning agent then pulls in only the lines it needs. This transforms context cost from O(file_size) to O(result_count). A graduated reading protocol (`tree` → `rg` → `sed -n`) uses about 670 tokens where reading all relevant files would cost 15,000+. That's 95% savings, and it's not a trick. It's compression.

**Models don't delegate unless you force them.** They're trained to be helpful, which means they try to do everything themselves, bloating their context window until they degrade. You have to explicitly instruct the coordinator: "You MUST spawn sub-agents for file reading. You MUST use plan mode before implementing. You coordinate. They execute." Without this, agents don't scale. They just get slower and dumber.

**Context isolation is what makes multi-agent systems work.** Not shared context. That's the trap everyone falls into first. Each agent operates in a clean window and returns only synthesized results. LangChain's research found that subagent patterns process 67% fewer tokens than handoff patterns for exactly this reason. The coordinator doesn't need to see every file the explorer read. It needs the compressed result.

**Auto-compaction is recursive compression happening in real time.** When Claude Code hits ~83.5% context usage, it summarizes the entire conversation into a condensed version and continues from there. The raw history is preserved on disk, but the model only sees the summary. I started giving it custom focus instructions before compaction ("preserve the task list status, active teammates, and safety rules"), and the difference in post-compaction coherence was night and day. The model compresses better when you tell it what matters.

At some point I stopped thinking about these as engineering tricks and started seeing the pattern underneath them. Every optimization I'd made was the same operation at different scales: small models reading and summarizing for larger models, graduated levels of abstraction, layer-aware instructions that change what gets preserved at each depth. I was building a recursive compression pipeline by hand, one `sed` command at a time.

So I went looking for the theory.

## The Theory: Compression Is Intelligence

The Hutter Prize offers €500,000 for compressing 1GB of Wikipedia. Not for AI research. Not for novel architectures. For compression. Because the premise is that to compress something well, you have to understand it. You have to know what's essential, what's redundant, what's derivable from context. ***Compression and comprehension are the same operation.***

The thread goes back further than the prize. Gregory Chaitin, one of the founders of algorithmic information theory, put it as plainly as anyone has: "Compression is comprehension." Not as a metaphor — as a mathematical claim. In his framework, every scientific theory is literally a compressed representation of observed data. Newton's laws compress the motion of every object in the universe into a handful of equations. E=mc² compresses the relationship between mass and energy into five characters. The shorter the program that generates the observation, the deeper the understanding. Ray Solomonoff formalized this in 1964, proving that optimal prediction and optimal compression are the same operation. Marcus Hutter unified both threads with AIXI and operationalized the whole thing with a cash prize. The idea that compression equals intelligence isn't a recent ML insight. It's been converging from mathematics, philosophy, and information theory for over sixty years.

DeepMind formalized it for language models in "Language Modeling Is Compression" (Delétang et al., ICLR 2024), proving that optimal prediction and optimal compression are mathematically equivalent. Chinchilla 70B compresses ImageNet to 43.4%, beating PNG, and LibriSpeech to 16.4%, beating FLAC. These aren't language tasks. LLMs aren't just language models. ***They're general-purpose compression engines that happen to be trained on text.***

In 2024, Huang et al. closed the remaining gap between theory and empirical evidence. They treated 31 public LLMs from nine different organizations as data compressors, measured how efficiently each model compressed external text, and plotted that against downstream benchmark scores across twelve tasks. The correlation was almost perfectly linear: Pearson ρ ≈ −0.95. Better compressor, smarter model — across different architectures, different tokenizers, different training data, all sitting on the same curve. The average deviation from the line was 3.1 percentage points, which is within the noise range of just changing prompt formatting. Before this paper, compression-equals-intelligence was a theoretical claim. After it, it's a measured straight line across 31 models.

What made my ears perk up: the correlation sharpened when they matched the compression corpus to the task domain. Compressing GitHub code predicted coding ability at ρ = −0.937. Compressing ArXiv papers predicted mathematical reasoning at ρ = −0.953. But using Common Crawl to predict math scores dropped the correlation to −0.623. What you compress *against* determines what intelligence emerges. This mapped directly onto what I'd found in my agent hierarchies. You can't run the same generic compression at every depth. Early layers should preserve facts and entities. Middle layers should preserve relationships and causal chains. Deep layers should preserve reasoning patterns and structural insights. Huang et al. proved it statistically across 31 models. I'd stumbled into it empirically, one `sed` command at a time.

And this is exactly what I was watching play out in real time. A Haiku model reads 4,000 tokens of code and returns 300 tokens of structure. *That's compression.* A Sonnet teammate reads the summaries from five Haiku agents and synthesizes them into a plan. *That's compression of compression.* The Opus coordinator reads the plan and makes a decision. Each layer strips noise, preserves signal, and passes a denser representation upward.

The question that kept me up: *what if you formalized this?* What if instead of doing it ad hoc with `sed` commands and manual sub-agent hierarchies, you built a pipeline that recursively compressed arbitrarily large inputs into something a single frontier model could reason over?

## The Architecture

```
Layer 0: Raw data (10TB)
    ↓ [Chunking + Parallel Agent Swarm]
Layer 1: Compressed representations
    ↓ [Agent Swarm, recursive compression]
Layer 2: Higher-order abstractions
    ↓ ...
Layer N: Dense semantic signal (~200K tokens)
    ↓ [Frontier Model, full reasoning]
Output: Answer / Analysis / Decision
```

The structure mirrors the three-tier agent hierarchy, generalized. Small cheap models (Llama 8B via Groq, pennies per call) handle chunk-level compression in parallel. Thousands of them, simultaneously. The frontier model only touches the final compressed output. This inverts the cost structure: the smartest model does the hardest thinking against the smallest, densest input.

The prompts evolve with depth, the same way my agent team briefings did. Early layers preserve facts and entities. Middle layers preserve relationships and causal chains. Deep layers preserve reasoning patterns and structural insights. You're not running the same summarization prompt eight times. Each layer has a different compression objective, because what you need to preserve changes as abstraction increases.

And the whole thing is embarrassingly parallel at each layer. Every chunk at a given depth compresses independently. This is MapReduce for semantic content.

## The Math That Should Have Killed the Idea

I expected it to. I sat down and ran the numbers, fully prepared to land on something absurd: "you'd need 500 layers" or "the compression ratio required violates information theory." I was looking for the reason this doesn't work.

At roughly 10:1 compression per layer (conservative, given that LLMLingua demonstrates 20x at minimal loss), the layers required to compress a corpus of T tokens into a 200K context window follow `log₁₀(T / 200,000)`.

| Data Size | What It Is | Layers |
|-----------|-----------|--------|
| 800 KB | Claude's context window | 0 |
| 1 GB | A large codebase | 4 |
| 20 GB | All of English Wikipedia | 5 |
| 1 TB | Estimated GPT-4 training data | 7 |
| 15 TB | Library of Congress (text) | 8 |
| 50 TB | All books ever written | 8 |
| 1 EB | Total data created per year | 13 |

Read that table again. Going from "a textbook" to "all human knowledge ever written" costs five additional layers. The scaling is logarithmic. Eight layers. Just eight. That could compress every book humanity has ever produced into something a single frontier model can reason over.

When I first saw that number I thought I'd made an error. I hadn't. The existing literature backs it: RAPTOR shows 72% compression per layer is sustainable at tested depths. Gist Tokens achieves 26x compression with minimal quality loss. The statistical mechanics of semantic compression (arXiv:2503.00612) identifies phase transitions showing high compressibility is possible without crossing into semantic destruction.

The math didn't kill the idea. It made it feel inevitable.

## The Hard Problems

I'm not hand-waving these. If this architecture were trivial, someone would have built it already.

**Cross-chunk signal death.** The same problem I hit in agent teams when context isolation goes too far. If line 47 in chunk 1 and line 12 in chunk 50,000 together reveal an insight, but neither looks important alone, that connection dies during local compression. In my agent workflows, I mitigated this by having the coordinator maintain a relationship graph of cross-cutting concerns. The proposed architecture uses pre-compression embedding-based similarity detection to surface these connections before chunking. It helps. It doesn't solve it completely.

**Lossy drift.** If each pass preserves 95% of reasoning-relevant information, eight layers retain about 66% of the original signal. That sounds bad until you realize: the 34% you lost was the noise. In practice with my agent teams, the quality of compression instructions mattered far more than the compression ratio. Layer-aware prompts that explicitly tell the model "at this depth, preserve causal relationships over specific names" dramatically changed what survived. The architecture addresses this by retaining all intermediate layers as a pyramid, so the frontier model can zoom in when the top layer proves insufficient.

**Query-independent compression.** You're compressing before knowing the question. Same problem as building a general-purpose code index vs. a query-specific search. The proposed solution is a two-phase approach: expensive general-purpose compression runs once offline, cheap query-time pyramid traversal runs per question. Pre-compute the structure, navigate it on demand.

## Connection to RLM

MIT published Recursive Language Models (Zhang, Khattab, Kraska, December 2025) while I was developing this. RLM takes the opposite approach: instead of pre-compressing, it lets the model write code to recursively slice and inspect raw data at query time. On inputs of 6–11 million tokens, standard models scored 0%. RLM with GPT-5 scored 91.33%.

The approaches are complementary, not competing. RLM handles query-time decomposition. This architecture handles pre-query compression. The compression pyramid could serve as the structured variable that RLM operates on, drilling into lower layers on demand rather than processing raw data every time. Pre-compression for speed, recursive traversal for precision. Together, they're the full stack.

## What the Researchers Proved — and What They Didn't Build

Here's what everything I've cited has in common: it operates at the level of model weights. How well does a trained model compress text? How does that compression efficiency correlate with benchmark performance? The question is always about the model's internal representations — about what the model *is*.

Nobody asked the inference-time question.

Nobody asked: what if you used models *as* compressors at runtime — not measuring their compression ability, but deploying it as an engineering primitive? What if the same principle that makes a model intelligent during training could be exploited at inference time to make it reason over inputs that would otherwise destroy it?

That's what I've been doing by hand. When I instruct a Haiku agent to return file references instead of file contents, I'm applying compression at inference time. When I build a graduated reading protocol that cuts 15,000 tokens down to 670, I'm running the same operation Huang et al. measured — at a different layer of the stack. When I give agents layer-aware instructions that change what gets preserved at each depth, I'm doing exactly what their domain-specific findings predicted: matching the compression to the task.

The rabbit hole goes deeper than I expected. Maguire and colleagues at University College Dublin proposed that consciousness itself — not just intelligence, but subjective experience — might be data compression, coining the term "Compressionism" as a formal theory of mind. I'm not qualified to evaluate that claim. But I notice that the thread connecting Shannon (1948) to Solomonoff (1964) to Chaitin (2006) to Hutter (2006) to DeepMind (2024) to Huang et al. (2024) has been converging from independent fields for seventy-five years. That kind of convergence usually means something.

The researchers proved the relationship at the model level. The practitioners discovered the same thing independently from the engineering side. What hasn't been built is the recursive pipeline that takes this from manual technique to systematic architecture — the thing that lets eight layers of logarithmic scaling compress a library into a context window.

The components all exist. The theory is proven from multiple directions. The engineering is understood. I think this is less a question of *whether* someone builds it than *when* — and whether, when they do, they realize they're assembling a sixty-year-old idea that mathematicians, philosophers, and information theorists have been pointing at all along.

None of this started with a theory. It started with watching Claude Code choke on a 3,000-line file, trimming the context down to make it work, and then one day recognizing the pattern underneath the fix.

---

*Jake Harris ([@jakeharrisdev](https://x.com/jakeharrisdev) · [jakejh.com](https://jakejh.com)) is a software engineer at DocuSign building distributed systems and AI tooling. The full literature review and extended architecture discussion are available as a separate research document. Reach out if you're working on something adjacent.*
