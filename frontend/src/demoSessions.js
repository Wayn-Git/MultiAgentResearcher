// ─────────────────────────────────────────────────────────────────────────────
// DEMO SESSIONS — Hardcoded example research outputs shown to all users
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_SESSIONS = [
  {
    id: 'demo_watches',
    title: 'The Origin & History of Watches',
    isDemo: true,
    logs: [
      { type: 'user', content: 'The Origin & History of Watches' },
      {
        type: 'sys', step: 'task', failed: false,
        data: [
          { query: 'Origins of timekeeping before mechanical watches', description: 'Investigate early human methods of measuring time including sundials, water clocks, and hourglasses across ancient civilizations.' },
          { query: 'Invention of the portable spring-driven clock and pocket watch', description: 'Trace the development from tower clocks to portable spring-driven pocket watches in 15th-16th century Europe, focusing on the Nuremberg craftsmen.' },
          { query: 'Evolution of wristwatches in the 20th century and quartz revolution', description: 'Examine the shift from pocket to wrist watches, the quartz crisis of the 1970s, and the rise of the modern luxury watch market.' },
        ]
      },
      {
        type: 'sys', step: 'retrieval', failed: false,
        data: [
          { title: 'History of Watches — Encyclopedia Britannica', url: 'https://www.britannica.com/technology/watch-timepiece', snippet: 'The watch evolved from portable spring-driven clocks, which appeared in 15th-century Europe. The earliest portable timepieces were made in Nuremberg, Germany in the early 1500s by craftsmen like Peter Henlein.' },
          { title: 'The Evolution of Timekeeping — Science Museum London', url: 'https://www.sciencemuseum.org.uk/objects-and-stories/clocks-and-watches', snippet: 'From ancient sundials in Egypt (3,500 BCE) to water clocks adopted by Greeks and Romans, humans have long sought to measure the passage of time with increasing accuracy.' },
          { title: 'Wristwatches in World War I — Military Time Center', url: 'https://militarytimecenter.com/wristwatch-wwi', snippet: 'Wristwatches became standard military equipment during WWI, as soldiers needed to synchronize troop movements without fumbling for a pocket watch under fire.' },
          { title: 'The Quartz Crisis and Swiss Watchmaking — Hodinkee', url: 'https://www.hodinkee.com/articles/quartz-crisis-history', snippet: 'In the 1970s, Japanese quartz movements produced by Seiko nearly destroyed the Swiss industry. Employment fell from 90,000 to 28,000 workers in a decade.' },
          { title: 'Patek Philippe Museum — 500 Years of Horology', url: 'https://www.patek.com/en/company/patek-philippe-museum', snippet: 'The museum chronicles over 500 years of watchmaking, with pieces from the earliest pocket watches of the 1500s through to contemporary grand complications.' },
        ]
      },
      {
        type: 'sys', step: 'synthesis', failed: false,
        data: {
          synthesized_summary: 'The history of watches spans over 5,000 years of ingenuity. From primitive sundials in ancient Egypt through medieval water clocks, the journey led to spring-driven portable clocks in 15th-century Nuremberg. Peter Henlein is credited with the first pocket watch (~1505 CE). Wristwatches gained mass adoption during WWI and the quartz revolution of the 1970s fundamentally disrupted Swiss mechanical watchmaking, which survived by repositioning as a luxury art form.',
          key_findings: [
            'The earliest mechanical clocks appeared in 13th-century European cathedrals, primarily for bell-ringing coordination, with no hands or dials.',
            'Peter Henlein of Nuremberg is credited with creating the first portable spring-driven watch around 1505 CE.',
            'Wristwatches were initially considered feminine accessories; WWI battlefield utility permanently changed societal perception.',
            'The quartz crisis of the 1970s saw Swiss watchmakers lose two-thirds of their global market share to Japanese manufacturers.',
            'The Swatch brand (1983) and cultural repositioning toward luxury saved the Swiss watchmaking industry from collapse.',
          ],
          core_concepts: ['Horology', 'Mainspring', 'Escapement', 'Quartz oscillator', 'Tourbillon', 'Complications'],
          confidence_score: 0.91,
        }
      },
      {
        type: 'sys', step: 'critic', failed: false,
        data: {
          critique_log: [
            'Attribution of the first watch to Peter Henlein is historically debated — some scholars point to earlier Italian clockmakers.',
            'The synthesis underrepresents non-European timekeeping traditions, including Chinese astronomical clocks and Islamic engineer Al-Jazari.',
          ],
          refined_synthesis: {
            synthesized_summary: 'Watchmaking is a global story. While European craftsmen in Nuremberg and Geneva dominate Western histories, the 12th-century Islamic engineer Al-Jazari designed sophisticated water clocks, and Su Song\'s 10th-century Chinese astronomical clock tower is among the most complex pre-modern mechanical devices ever built. The lever escapement (Thomas Mudge, 1759) remains the foundation of most mechanical watches today.',
            key_findings: [
              'Al-Jazari\'s 12th-century elephant clock featured automata and multi-cultural symbolism, representing the Islamic Golden Age of engineering.',
              'The lever escapement, invented by Thomas Mudge in 1759, is still the standard in virtually all mechanical watches.',
              'Omega\'s Speedmaster was NASA-certified for spaceflight in 1965 — the pinnacle of precision watchmaking.',
            ],
          }
        }
      },
      {
        type: 'sys', step: 'cross_synthesis', failed: false,
        data: {
          summary: 'All major sources agree that watchmaking evolved from utilitarian timekeeping into a luxury art form. WWI was universally pivotal for wristwatch adoption, and the 1969 Seiko Astron quartz watch was the single most disruptive product in watchmaking history.',
          agreements: [
            'Wristwatches gained mass adoption primarily through military necessity during World War I.',
            'The quartz movement (Seiko, 1969) fundamentally disrupted Swiss mechanical watchmaking within a decade.',
            'Swiss watchmaking survived by repositioning as aspirational luxury goods rather than competing on precision.',
          ],
          conflicts: [
            'Disputed attribution: some sources credit Blaise Pascal, others Italian makers, for early wristwatch-style timekeepers predating Henlein.',
          ],
          source_count: 5,
        }
      },
      {
        type: 'sys', step: 'gap', failed: false,
        data: {
          global_gaps: [
            'Limited coverage of African and pre-Columbian American timekeeping traditions and their influence.',
            'The role of women both as primary early consumers and as craftswomen in watchmaking history is largely unaddressed.',
            'Smartwatch market dynamics post-2015 and their long-term impact on traditional mechanical horology.',
          ],
          followup_queries: [
            'How do smartwatches compare to mechanical watches in global market share between 2018 and 2024?',
            'What is the future of luxury mechanical watchmaking in the digital age?',
          ]
        }
      },
      {
        type: 'sys', step: 'report', failed: false,
        data: {
          title: 'The Origin & History of Watches',
          word_count: 780,
          markdown: `# The Origin & History of Watches

## Executive Summary

The watch — that intimate companion of daily life — is the product of over five millennia of human curiosity about time. From carved stone sundials in ancient Egypt to atomic-synchronized smartwatches, the story of watchmaking is inseparable from the story of civilization itself.

---

## Ancient Beginnings

Humans first measured time using **natural phenomena**: the movement of the sun, moon, and stars. The earliest surviving timekeeping instruments are Egyptian sundials dating to approximately **3,500 BCE**. By 1400 BCE, water clocks (*clepsydrae*) were in widespread use across Egypt, Greece, and Mesopotamia.

The Islamic scholar **Al-Jazari** (1136–1206 CE) elevated water-clock technology to extraordinary heights, designing intricate elephant clocks with automated figures — direct precursors of the automata found in luxury watches today.

---

## The Mechanical Revolution (13th–16th Century)

The first fully mechanical clocks appeared in **13th-century European monasteries**, driven by falling weights and escapement mechanisms. These tower clocks had no hands — they simply rang bells.

The pivotal leap came with the development of the **coiled mainspring**, enabling clocks to be freed from their towers. By **1505**, the Nuremberg craftsman **Peter Henlein** produced what many historians consider the first pocket watch.

---

## The 20th Century: From Pocket to Wrist

Wristwatches existed as early as the 1860s as feminine jewelry. Men's attitudes changed during **World War I**, when soldiers required hands-free timekeeping on the battlefield.

Key milestones of the 20th century:
- **1926**: Rolex Oyster — the first waterproof wristwatch
- **1953**: Blancpain Fifty Fathoms — the first modern diving watch
- **1965**: Omega Speedmaster — NASA-certified for space missions
- **1969**: Seiko Astron — the world's first quartz wristwatch

---

## The Quartz Crisis & Modern Era

The **quartz revolution** of the 1970s nearly ended Swiss mechanical watchmaking. Swiss employment collapsed from 90,000 to 28,000 workers in a decade.

The Swiss response was **cultural repositioning** — mechanical watches became symbols of craftsmanship and heritage. Nicolas Hayek's **Swatch** (1983) captured affordable markets while Rolex, Patek Philippe, and Audemars Piguet dominated luxury.

---

## Conclusion

The watch has evolved from a scientific instrument into a **cultural artifact** — simultaneously a precision tool, a fashion statement, and mechanical art. As smartwatches challenge traditional horology once again, the mechanical watch endures as testament to the enduring human appreciation for craft in a digital world.`
        }
      },
      { type: 'sys', content: 'Session Archived.' },
    ]
  },

  {
    id: 'demo_zero',
    title: 'The Concept of Zero in Mathematics',
    isDemo: true,
    logs: [
      { type: 'user', content: 'The Concept of Zero in Mathematics' },
      {
        type: 'sys', step: 'task', failed: false,
        data: [
          { query: 'Who invented zero and when across ancient civilizations?', description: 'Trace the historical origins of zero as both a placeholder and a number across Babylonian, Mayan, and Indian mathematical traditions.' },
          { query: 'Philosophical resistance to zero in Greek and European thought', description: 'Examine how zero challenged Greek philosophy (Aristotle\'s rejection of void) and why Europe resisted it for centuries after its Indian formulation.' },
          { query: 'Zero in modern mathematics, calculus, and computer science', description: 'Investigate the foundational role of zero in calculus limits, set theory, binary computing, and programming null states.' },
        ]
      },
      {
        type: 'sys', step: 'retrieval', failed: false,
        data: [
          { title: 'Zero: The Biography of a Dangerous Idea — Charles Seife', url: 'https://en.wikipedia.org/wiki/Zero:_The_Biography_of_a_Dangerous_Idea', snippet: 'Zero was a revolutionary idea that challenged the entirety of Greek philosophy and Roman mathematics. Its acceptance transformed science, theology, and philosophical thought across the Western world.' },
          { title: 'The History of Zero — MacTutor Mathematics Archive', url: 'https://mathshistory.st-andrews.ac.uk/HistTopics/Zero/', snippet: 'The Babylonians had a placeholder for zero (c. 300 BCE) but never treated it as a number. The Indians were first to give zero full arithmetic properties, under the mathematician Brahmagupta in 628 CE.' },
          { title: 'Brahmagupta and the Rules of Zero — Ancient History Encyclopedia', url: 'https://www.ancient.eu/brahmagupta/', snippet: 'In Brahmasphutasiddhanta (628 CE), Brahmagupta defined: zero plus zero is zero; a debt minus zero is a debt; a fortune minus zero is a fortune. He also noted that zero divided by zero is zero — a rule later corrected.' },
          { title: 'Maya Zero — Independent Discovery — History.com', url: 'https://www.history.com/news/who-invented-the-zero', snippet: 'The Maya independently developed the concept of zero at least by 4 BCE for their Long Count calendar, using a distinctive shell-shaped glyph unlike any Old World symbol.' },
          { title: 'Zero in Computer Science and Binary Logic', url: 'https://cs.stanford.edu/zero-binary', snippet: 'Modern computing is built on binary (0 and 1). Zero represents the OFF state in digital logic, NULL in databases, false in Boolean algebra, and the origin point in memory addressing.' },
        ]
      },
      {
        type: 'sys', step: 'synthesis', failed: false,
        data: {
          synthesized_summary: 'Zero was independently invented by multiple civilizations: the Babylonians used it as a placeholder (c. 300 BCE), the Maya developed it for calendrical calculation (c. 4 BCE), and the Indians — culminating in Brahmagupta\'s 628 CE formulation — were first to treat it as a true number with defined arithmetic rules. Transmitted through Islamic scholarship to Europe, zero transformed mathematics, enabled calculus, and today underpins every digital system ever built.',
          key_findings: [
            'The Babylonians used a placeholder for zero but never assigned it numerical properties or used it independently.',
            'Brahmagupta (628 CE) was the first mathematician to define zero as a number and establish rules for its arithmetic.',
            'The Maya independently discovered zero for use in their Long Count calendar, with no known contact with Indian mathematics.',
            'Fibonacci\'s Liber Abaci (1202) was critical in transmitting the Hindu-Arabic numeral system, including zero, to medieval Europe.',
            'Newton and Leibniz\'s invention of calculus depends fundamentally on the concept of a limit approaching zero.',
          ],
          core_concepts: ['Additive identity', 'Placeholder vs. number', 'Division by zero', 'Null set', 'Binary representation'],
          confidence_score: 0.94,
        }
      },
      {
        type: 'sys', step: 'critic', failed: false,
        data: {
          critique_log: [
            'The claim that zero was "invented" should be examined — philosophers of mathematics debate whether zero, like other mathematical objects, was discovered rather than invented.',
            'The synthesis underrepresents Greek philosophical resistance, which is key to understanding why zero took so long to reach Europe despite being known in the Islamic world for centuries.',
          ],
          refined_synthesis: {
            synthesized_summary: 'Zero is one of humanity\'s most contested and radical ideas. Aristotle explicitly rejected the concept of void, and the Roman numeral system had no symbol for zero, making complex arithmetic cumbersome for over a millennium. The Church\'s association of zero with the void and the devil further delayed European adoption. Today zero is universal: the origin of number lines, the null value in every programming language, and the edge case that crashes programs and defines mathematical limits.',
            key_findings: [
              'Aristotle explicitly rejected the concept of void on metaphysical grounds: if nothing exists, it cannot be something.',
              'The Roman numeral system\'s lack of zero made multiplication and division laborious, stunting European commercial mathematics.',
              'Church authorities in medieval Europe were suspicious of zero, associating nothingness with heresy and the devil.',
              'Al-Khwarizmi\'s 9th-century Baghdad treatise was the primary vehicle for transmitting Indian zero-inclusive numerals to Islamic scholars.',
            ],
          }
        }
      },
      {
        type: 'sys', step: 'cross_synthesis', failed: false,
        data: {
          summary: 'Scholarship unanimously recognizes Brahmagupta\'s 628 CE formulation as the definitive mathematical treatment of zero. All sources confirm zero\'s philosophical radicalism and its centuries-long resistance in European thought. Modern computing\'s dependence on zero is uncontested.',
          agreements: [
            'Brahmagupta\'s 628 CE Brahmasphutasiddhanta is universally recognized as the first complete mathematical definition of zero.',
            'Zero is the additive identity (n + 0 = n) and a foundational element of all positional numeral systems.',
            'Division by zero remains undefined in standard mathematics, a consistent logical boundary across all number systems.',
          ],
          conflicts: [
            'Philosophical debate: Mathematics scholars disagree on whether zero was "invented" (a human construct) or "discovered" (a pre-existing truth).',
          ],
          source_count: 5,
        }
      },
      {
        type: 'sys', step: 'gap', failed: false,
        data: {
          global_gaps: [
            'The Chinese mathematical tradition\'s independent relationship with zero and emptiness (kong) is underrepresented in Western scholarship.',
            'Psychological and educational challenges of teaching the concept of zero to young children remain underexplored.',
            'Zero in quantum physics — specifically the quantum vacuum state and zero-point energy — is a rich area for further research.',
          ],
          followup_queries: [
            'How does division by zero propagate errors in real-world computing systems, and how is it handled in major languages?',
            'What is the philosophical difference between zero, null, undefined, and nothing?',
          ]
        }
      },
      {
        type: 'sys', step: 'report', failed: false,
        data: {
          title: 'The Concept of Zero in Mathematics',
          word_count: 720,
          markdown: `# The Concept of Zero in Mathematics

## Executive Summary

Zero is arguably the most powerful and counterintuitive number in mathematics. Its journey from philosophical taboo to computational bedrock spans three continents and over two thousand years of intellectual history.

---

## Origins: Three Independent Discoveries

Zero was not invented once — it emerged independently across multiple civilizations:

**Babylonia (~300 BCE)**: Used a placeholder symbol (two slanted wedges) in positional notation but never treated zero as a number with arithmetic properties.

**Maya (~4 BCE)**: Independently developed zero — symbolized by a shell glyph — for use in their sophisticated Long Count calendar system.

**India (628 CE)**: The mathematician **Brahmagupta** was the first to treat zero as a full number, defining rules in *Brahmasphutasiddhanta* — including the foundational identity: *n + 0 = n*.

---

## The Greek Resistance

Ancient Greek mathematics, for all its sophistication, had no concept of zero. **Aristotle** explicitly rejected the idea of void on metaphysical grounds: if nothing exists, how can it be something?

The Roman numeral system, which dominated European mathematics for over a millennium, had **no symbol for zero**, making positional arithmetic extraordinarily cumbersome.

---

## Transmission to Europe

The Indian zero traveled westward through **Islamic scholarship**:
- **Al-Khwarizmi** (9th century CE) documented the Hindu-Arabic numeral system in Baghdad
- **Fibonacci** introduced it to Europe in *Liber Abaci* (1202), demonstrating its commercial utility

Despite initial resistance from Church authorities — who associated zero with the void and considered it potentially heretical — the zero-inclusive system gradually replaced Roman numerals across Europe by the 15th century.

---

## Zero in Modern Mathematics

Zero is not merely a placeholder — it is conceptually fundamental:

- **Additive identity**: *n + 0 = n* for all numbers
- **Multiplicative annihilator**: *n × 0 = 0* for all numbers
- **Undefined boundary**: *n ÷ 0* remains undefined, preserving mathematical consistency
- **Foundation of calculus**: Limits approaching zero are the basis of every derivative and integral
- **Set theory**: The empty set (∅) is the "zero" of set theory

---

## Zero in Computing

Modern computing is fundamentally binary — built from **0s and 1s**. Zero represents:
- The \`OFF\` state in digital logic gates
- \`NULL\` in database systems
- \`false\` in Boolean algebra
- The memory origin address in virtually all processor architectures

When a program crashes due to a *null pointer dereference* or *division by zero* error, it is confronting the same philosophical abyss that troubled Aristotle two millennia ago.

---

## Conclusion

Zero is the number that **defines the edge of human mathematical comprehension** — simultaneously representing nothing and making everything possible. It took humanity millennia to accept it, yet today it underpins every calculation, every digital system, and every scientific model. To understand zero is to understand the strange, elegant nature of mathematics itself.`
        }
      },
      { type: 'sys', content: 'Session Archived.' },
    ]
  },
]
