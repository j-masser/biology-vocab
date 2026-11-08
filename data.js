// =====================================================================
// BIOLOGY VOCAB: the word list
// This is the only file you need to change to add vocabulary. Upload just
// this file to GitHub; the site picks up the change the next time it's opened.
// =====================================================================
//
// HOW TO ADD A NEW UNIT (example: Otters)
//
// 1. SETS: the unit is already listed below (Otters, Melanin, Cancer).
//    A set only appears for students once one of its lessons is open.
//
// 2. UNITS: add one line per lesson, in the unit's section. Example:
//      {"id": "ot_food", "name": "Otter Food Webs", "set": "otters", "start": "TBD"},
//    - "id": short, lowercase letters/numbers/underscores, never changed later.
//      Start Otters ids with ot_, Melanin with me_, Cancer with ca_.
//    - "start": "TBD" keeps the lesson hidden from students. When you know the
//      date, change it to "YYYY-MM-DD", e.g. "2027-02-15". Lessons open that day.
//
// 3. TERMS: add one line per word, in the unit's section. Example:
//      {"id": "ot_keystone_species", "t": "Keystone species", "u": "ot_food", "d": "A species that ...", "ex": "Sea otters"},
//    - "id": unique, lowercase, underscores instead of spaces. Never change it
//      once students have practiced it (their progress is saved under the id).
//    - "t" = the word, "u" = the lesson id, "d" = definition, "ex" = example (optional).
//
// 4. NOTES (fill-in sentences): one line per sentence. Put [brackets] around each blank.
//      {"id": "ot_1", "u": "ot_food", "s": "A keystone species has a [large] effect on its [ecosystem]."},
//    - "id": unique, never changed. Number them: ot_1, ot_2, ot_3 ...
//
// RULES THAT KEEP THE SITE WORKING
//    - Every line ends with a comma, even the last one in a list.
//    - Use straight double quotes " " around every key and value.
//    - If a definition needs a quote mark inside it, write \" (backslash quote).
//    - If something is wrong, the site shows a message saying so. Teachers also
//      see a list of problems (like a repeated id) at the top of the dashboard.
// =====================================================================

// Review sets (major assessments). Each lesson below belongs to one set.
export const SETS = [
  {"id":"lions1","name":"Lions 1st half"},
  {"id":"lions2","name":"Lions 2nd half"},
  {"id":"elephants","name":"Elephants"},
  {"id":"otters","name":"Otters"},
  {"id":"melanin","name":"Melanin"},
  {"id":"cancer","name":"Cancer"},
];

// Lessons (topic buttons and quiz study groups).
export const UNITS = [
  // ---------- Lions 1st half ----------
  {"id":"group","name":"Group Behavior","set":"lions1"},
  {"id":"gen","name":"Genetics & Fitness","set":"lions1"},
  {"id":"evo","name":"Phylogenetic Trees","set":"lions1"},

  // ---------- Lions 2nd half ----------
  {"id":"energy","name":"Energy & Diets","set":"lions2"},
  {"id":"macro","name":"Macromolecules","set":"lions2"},
  {"id":"enz","name":"Enzymes","set":"lions2"},
  {"id":"food","name":"Food Chains & Webs","set":"lions2"},

  // ---------- Elephants ----------
  {"id":"el_pop","name":"Populations & Limiting Factors","set":"elephants","start":"TBD"},
  {"id":"el_ns","name":"Natural Selection","set":"elephants","start":"TBD"},
  {"id":"el_dna","name":"DNA Profiling","set":"elephants","start":"TBD"},
  {"id":"el_cons","name":"Human Activity & Conservation","set":"elephants","start":"TBD"},
  {"id":"el_photo","name":"Photosynthesis","set":"elephants","start":"TBD"},
  {"id":"el_energy","name":"Cellular Respiration & ATP","set":"elephants","start":"TBD"},

  // ---------- Otters (add lessons here, e.g. {"id": "ot_lesson1", "name": "Lesson name", "set": "otters", "start": "TBD"},) ----------

  // ---------- Melanin (add lessons here, e.g. {"id": "me_lesson1", "name": "Lesson name", "set": "melanin", "start": "TBD"},) ----------

  // ---------- Cancer (add lessons here, e.g. {"id": "ca_lesson1", "name": "Lesson name", "set": "cancer", "start": "TBD"},) ----------
];

// Vocabulary terms.
export const TERMS = [
  // ---------- Lions 1st half ----------
  {"id":"behavior","t":"Behavior","u":"group","d":"The way an organism acts or responds to its surroundings and to other organisms.","ex":"Lions hunting together is a behavior."},
  {"id":"group_behavior","t":"Group behavior","u":"group","d":"Actions many members of a species do together that improve their chances of surviving and reproducing — benefits that individuals cannot achieve alone.","ex":"Flocking, schooling, herding, cooperative hunting, migrating."},
  {"id":"flocking","t":"Flocking","u":"group","d":"Birds flying together in flocks, which reduces the risk of being preyed upon and increases foraging efficiency.","ex":"Birds in flocks"},
  {"id":"schooling","t":"Schooling","u":"group","d":"Fish swimming together; their coordinated, collective movement confuses predators, so each fish is less likely to become prey.","ex":"Schools of fish"},
  {"id":"herding","t":"Herding","u":"group","d":"Animals like elephants and buffalo forming groups to protect vulnerable members from predators.","ex":"Elephants, buffalo"},
  {"id":"cooperative_hunting","t":"Cooperative hunting","u":"group","d":"Predators using teamwork to hunt more effectively and capture larger prey than one could take down alone.","ex":"Lions, orcas, wolves hunting in packs"},
  {"id":"migrating","t":"Migrating","u":"group","d":"Moving in groups to a new area; group members share navigation and environmental cues and can find better breeding grounds.","ex":"Monarch butterflies, birds, penguins"},
  {"id":"foraging","t":"Foraging","u":"group","d":"Searching for and gathering food. Group foraging can lead to more effective food acquisition.","ex":"Cooperative foraging"},
  {"id":"chromosome","t":"Chromosome","u":"gen","d":"Found inside the nucleus of cells; made of long strands of DNA. Each human cell has 46 chromosomes (23 pairs).","ex":"Humans: 46 chromosomes (23 pairs)"},
  {"id":"gene","t":"Gene","u":"gen","d":"A segment of DNA that codes for a trait. You receive two copies of each gene, one on each chromosome: one from mom and one from dad.","ex":"The gene for mane color"},
  {"id":"allele","t":"Allele","u":"gen","d":"Different versions of a gene. The two alleles for one characteristic do not have to be the same; they can be different.","ex":"A and B"},
  {"id":"homozygous","t":"Homozygous","u":"gen","d":"When both alleles for one gene are the same (homo = the same).","ex":"AA"},
  {"id":"heterozygous","t":"Heterozygous","u":"gen","d":"When the two alleles for one gene are different (hetero = different).","ex":"AB"},
  {"id":"genotype","t":"Genotype","u":"gen","d":"The set of genes an organism contains. It’s written as a combination of letters.","ex":"AB"},
  {"id":"phenotype","t":"Phenotype","u":"gen","d":"The physical characteristics displayed by an organism.","ex":"A lion’s mane"},
  {"id":"karyotype","t":"Karyotype","u":"gen","d":"An organized image of an individual’s chromosomes.","ex":"A human karyotype shows 23 pairs"},
  {"id":"gametes","t":"Gametes","u":"gen","d":"Sex cells. Human gametes have only 23 chromosomes, half the 46 found in other cells.","ex":"Eggs and sperm"},
  {"id":"biological_fitness","t":"Biological fitness","u":"gen","d":"An organism’s success in surviving and reproducing to pass its genes on to the next generation.","ex":"Lulu (#630) protecting the cubs raised her fitness"},
  {"id":"direct_fitness","t":"Direct fitness","u":"gen","d":"Passing on your genes through your own direct children/offspring.","ex":"Lulu protecting her own daughter"},
  {"id":"indirect_fitness","t":"Indirect fitness","u":"gen","d":"Passing on your genes by helping close relatives (who share your DNA) survive.","ex":"Lulu protecting the other related cubs in the pride"},
  {"id":"gene_flow","t":"Gene flow","u":"gen","d":"The movement of genes in or out of a population, through movement of individuals or gametes. It can bring new alleles into a population or change how common alleles are.","ex":"A butterfly migrates and brings the spotted-wing allele to a new population."},
  {"id":"phylogenetic_tree_cladogram","t":"Phylogenetic tree / cladogram","u":"evo","d":"A branching diagram, like a family tree, showing the hypothesized relationships between different taxa based on physical and genetic characteristics.","ex":"Read it like a family tree."},
  {"id":"common_ancestor","t":"Common ancestor","u":"evo","d":"An ancestor shared by two or more taxa. Taxa that share a more recent common ancestor are more closely related.","ex":"Koala and kangaroo share a recent common ancestor."},
  {"id":"node","t":"Node","u":"evo","d":"The point on a phylogenetic tree where a branch splits. Each node represents a common ancestor.","ex":"Drawn as a dot where lines split"},

  // ---------- Lions 2nd half ----------
  {"id":"law_of_conservation_of_energy","t":"Law of conservation of energy","u":"energy","d":"Energy can be neither created nor destroyed; it can only be transferred to another form.","ex":"In living things, energy is transferred through the chemical bonds of carbohydrates and fats"},
  {"id":"cellular_respiration","t":"Cellular respiration","u":"energy","d":"The process cells use to break down food (glucose) to make usable energy. It also produces heat, which is where most energy is lost in a food chain.","ex":"Making usable energy"},
  {"id":"carnivore","t":"Carnivore","u":"energy","d":"A consumer that eats other consumers.","ex":"Weasel, fox, lion"},
  {"id":"herbivore","t":"Herbivore","u":"energy","d":"A consumer that eats producers.","ex":"Vole, zebra"},
  {"id":"omnivore","t":"Omnivore","u":"energy","d":"A consumer that eats both producers and other consumers.","ex":"Bears, humans"},
  {"id":"cellulose","t":"Cellulose","u":"energy","d":"A structural polysaccharide: a glucose polymer found in plant cell walls.","ex":"Plant fiber"},
  {"id":"detritivore","t":"Detritivore","u":"energy","d":"An organism that feeds on dead organic matter (detritus), helping break it down.","ex":"Earthworms, millipedes"},
  {"id":"feeding_niche","t":"Feeding niche","u":"energy","d":"An organism’s role in an ecosystem based on what it eats and how it gets its food.","ex":"Lions are carnivores"},
  {"id":"macromolecule_biomolecule","t":"Macromolecule / biomolecule","u":"macro","d":"A very large molecule made up of smaller repeating monomers joined together.","ex":"Starch, proteins, lipids"},
  {"id":"carbohydrate","t":"Carbohydrate","u":"macro","d":"A macromolecule made of C, H and O used for energy release and storage. Some carbohydrates are used for structure.","ex":"Bread, rice, fruit"},
  {"id":"protein","t":"Protein","u":"macro","d":"A macromolecule made of C, H, O and N, built from amino acids. Proteins are diverse in structure, so they have many functions: movement, transport, defense, hormones, structure and storage.","ex":"Meat, eggs, beans"},
  {"id":"lipid_fat","t":"Lipid / fat","u":"macro","d":"A macromolecule made of C, H and O that is insoluble in water. Found in fats, oils, waxes and hormones; used for long-term energy storage and insulation.","ex":"Butter, avocado, oil"},
  {"id":"reactant","t":"Reactant","u":"macro","d":"What goes into a reaction: the left side of the reaction, before the arrow.","ex":"Reactants → products"},
  {"id":"product","t":"Product","u":"macro","d":"What comes out of a reaction: the right side of the reaction, after the arrow.","ex":"An enzyme breaks a substrate into products."},
  {"id":"element_c_h_o_n","t":"Element (C, H, O, N)","u":"macro","d":"A substance made of atoms of the same type. Carbon, hydrogen, oxygen and nitrogen are the main elements in biomolecules.","ex":"Proteins contain C, H, O and N."},
  {"id":"monomer","t":"Monomer","u":"macro","d":"The repeating subunits or building blocks of a polymer. Mono = one.","ex":"Amino acids, monosaccharides"},
  {"id":"polymer","t":"Polymer","u":"macro","d":"The long chain molecules made of monomers. Poly = many.","ex":"Polypeptide, polysaccharide"},
  {"id":"monosaccharide","t":"Monosaccharide","u":"macro","d":"A simple sugar — “one sugar.”","ex":"Glucose, fructose, galactose"},
  {"id":"disaccharide","t":"Disaccharide","u":"macro","d":"“Two sugars”: formed when two monosaccharides link together in a dehydration synthesis reaction.","ex":"Sucrose"},
  {"id":"polysaccharide","t":"Polysaccharide","u":"macro","d":"“Many sugars”: long chains of monosaccharides. Storage polysaccharides store sugar; structural ones help build organisms.","ex":"Starch, cellulose"},
  {"id":"fatty_acid","t":"Fatty acid","u":"macro","d":"A key part of many lipids: a long hydrocarbon chain. Saturated = no C=C double bonds; unsaturated = at least one C=C.","ex":"3 fatty acids in a triglyceride"},
  {"id":"triglyceride","t":"Triglyceride","u":"macro","d":"A lipid made of glycerol plus three fatty acids, used as a long-term store of energy.","ex":"Body fat"},
  {"id":"steroid","t":"Steroid","u":"macro","d":"A lipid with a basic structure of four rings of carbon atoms. Steroids form many hormones.","ex":"Testosterone, estrogen"},
  {"id":"amino_acid","t":"Amino acid","u":"macro","d":"The monomer of proteins. Each has a variable side chain (R group).","ex":"Amino acids → polypeptide"},
  {"id":"dehydration_synthesis","t":"Dehydration synthesis","u":"macro","d":"Joins monomers into a polymer by removing water.","ex":"Two monosaccharides → disaccharide + water"},
  {"id":"hydrolysis","t":"Hydrolysis","u":"macro","d":"Breaks polymers into their monomers by adding water.","ex":"Digesting starch into glucose"},
  {"id":"enzyme","t":"Enzyme","u":"enz","d":"A biological catalyst. Enzymes speed up reactions in the body without being used up by lowering activation energy. Most are proteins with a specific shape.","ex":"Lactase, amylase, pepsin"},
  {"id":"substrate","t":"Substrate","u":"enz","d":"The molecule an enzyme acts on. It binds to the enzyme’s active site.","ex":"Lactose is lactase’s substrate."},
  {"id":"catalyst","t":"Catalyst","u":"enz","d":"Something that speeds up a reaction without being used up itself.","ex":"Enzymes are biological catalysts."},
  {"id":"activation_energy","t":"Activation energy","u":"enz","d":"The amount of energy required for a reaction to start. Enzymes lower it.","ex":"The “hill” on the energy graph"},
  {"id":"active_site","t":"Active site","u":"enz","d":"The region of an enzyme where the substrate binds. Its shape is complementary to the substrate.","ex":"The “keyhole”"},
  {"id":"lock_and_key","t":"Lock and key","u":"enz","d":"A model of enzyme action: the enzyme’s active site is perfectly complementary to the substrate, like a key fitting a lock.","ex":"Enzyme = lock, substrate = key"},
  {"id":"autotroph","t":"Autotroph","u":"food","d":"An organism that makes its own food using light energy (photosynthesis) or chemical energy (chemosynthesis).","ex":"Grasses, trees"},
  {"id":"producer","t":"Producer","u":"food","d":"Another name for an autotroph. Producers make their own food and are the start of every food chain.","ex":"Grass"},
  {"id":"heterotroph","t":"Heterotroph","u":"food","d":"An organism that consumes or eats other organisms to get chemical energy, because it cannot make its own food.","ex":"All animals"},
  {"id":"consumer","t":"Consumer","u":"food","d":"Another name for a heterotroph: an organism that eats other organisms for energy. All animals are consumers.","ex":"Vole, weasel, fox"},
  {"id":"decomposer","t":"Decomposer","u":"food","d":"An organism that breaks down dead organisms and organic matter to get chemical energy, recycling nutrients in the process.","ex":"Fungi, some bacteria"},
  {"id":"primary_consumer","t":"Primary consumer","u":"food","d":"A consumer that eats producers; usually a herbivore. Trophic level 2.","ex":"Vole eats grass"},
  {"id":"secondary_consumer","t":"Secondary consumer","u":"food","d":"A consumer that eats primary consumers. Trophic level 3.","ex":"Weasel eats vole"},
  {"id":"tertiary_consumer","t":"Tertiary consumer","u":"food","d":"A consumer that eats secondary consumers. Trophic level 4.","ex":"Fox eats weasel"},
  {"id":"trophic_level","t":"Trophic level","u":"food","d":"A feeding level in a food chain or energy pyramid. Most food chains have only 4 or 5 because energy flow between levels is inefficient.","ex":"Producers = level 1"},
  {"id":"ten_pct_rule","t":"10% rule","u":"food","d":"Only about 10% of the energy stored as biomass in one trophic level ends up as biomass in the next level. Most of the rest is lost as heat.","ex":"10,000 → 1,000 → 100 → 10 kcal"},
  {"id":"energy_pyramid","t":"Energy pyramid","u":"food","d":"A diagram that arranges trophic levels as a pyramid, showing energy decreasing at each level up.","ex":"Producers at the wide bottom"},
  {"id":"food_chain","t":"Food chain","u":"food","d":"A single path showing who eats whom. The arrows show the flow of energy.","ex":"Grass → vole → weasel → fox"},
  {"id":"food_web","t":"Food web","u":"food","d":"A model that illustrates all the feeding interactions in a community. It is a more accurate model of how energy moves than a food chain, which shows only a single set of energy-transfer relationships.","ex":"The Gorongosa National Park food web"},

  // ---------- Elephants ----------
  {"id":"population","t":"Population","u":"el_pop","d":"A group of individuals that belong to the same species, living in a given area at the same time.","ex":"The elephants of the Tsavo region in Kenya"},
  {"id":"density","t":"Density","u":"el_pop","d":"Population density: the number of individuals in a defined area (for example, per 1 km² or 100 km²). It measures how closely packed the individuals of a population are.","ex":"Many snails in one small patch = high density"},
  {"id":"dispersion","t":"Dispersion","u":"el_pop","d":"The pattern of distribution of the individuals of a population. The three patterns are clumped, uniform and random.","ex":"Clumped: otters and lions. Uniform: saguaro cacti. Random: dandelions"},
  {"id":"limiting_factor","t":"Limiting factor","u":"el_pop","d":"A factor in a population's environment that limits the population size, i.e. limits growth. Limiting factors can be biotic or abiotic.","ex":"Food, water, disease, predators"},
  {"id":"density_independent_limiting_factor","t":"Density-independent limiting factor","u":"el_pop","d":"A limiting factor that affects a population regardless of its density. These are usually abiotic factors.","ex":"Natural disasters, severe weather, pollution, human activity"},
  {"id":"density_dependent_limiting_factor","t":"Density-dependent limiting factor","u":"el_pop","d":"A limiting factor that affects population size differently depending on its density. These are usually biotic factors.","ex":"Spread of disease and parasites, competition, predation"},
  {"id":"abiotic","t":"Abiotic","u":"el_pop","d":"The nonliving factors in an ecosystem. Abiotic factors were never alive.","ex":"Sunlight, wind, soil, rocks, pond water"},
  {"id":"biotic","t":"Biotic","u":"el_pop","d":"The living factors in an ecosystem. Dead organisms are biotic too, because they were once living things.","ex":"Plants, algae, frogs, elephants"},
  {"id":"natural_selection","t":"Natural selection","u":"el_ns","d":"The process by which organisms change over time as those with traits best suited to an environment pass their traits to the next generation.","ex":"Tuskless elephants became more common in Gorongosa"},
  {"id":"variation","t":"Variation","u":"el_ns","d":"The V in VISA: individuals in a population or group differ in some trait of interest.","ex":"Some elephants have tusks and some don't"},
  {"id":"inheritance","t":"Inheritance","u":"el_ns","d":"The I in VISA: the variation in the trait of interest is at least partially inherited (passed from parents to offspring).","ex":"A mother passes the tuskless allele to her calf"},
  {"id":"survival_and_reproduction","t":"Survival and reproduction","u":"el_ns","d":"The S in VISA: more offspring are born than can survive, so individuals compete. Some individuals with a particular trait are more likely to survive and/or have more offspring than individuals without that trait.","ex":"Tuskless elephants weren't poached, so they had more calves"},
  {"id":"adaptation","t":"Adaptation","u":"el_ns","d":"The A in VISA: the frequency of a trait that helps individuals survive or leave more offspring increases in the population over time, as do the alleles that affect it. This can take many generations.","ex":"Tusklessness increased after the civil war in Mozambique"},
  {"id":"gel_electrophoresis","t":"Gel electrophoresis","u":"el_dna","d":"A technique used to separate DNA fragments based on their size. The fragments appear as bands on the gel. Smaller fragments move faster and travel farther than longer fragments.","ex":"Comparing ivory DNA bands to elephant DNA bands"},
  {"id":"dna_profile","t":"DNA profile","u":"el_dna","d":"A unique genetic profile for an individual, made from multiple STR markers. DNA profiling uses genetic markers to identify individuals or determine the geographic origin of a sample.","ex":"Matching seized ivory to the elephant it came from"},
  {"id":"el_allele","t":"Allele","u":"el_dna","d":"One copy of an STR fragment. An individual inherits one allele from each parent. The allele is named by its number of repeats or its length in base pairs (bp).","ex":"Genotype 3,5 repeats = 15,20 base pairs"},
  {"id":"loci","t":"Loci","u":"el_dna","d":"Specific locations on a chromosome (one location is a locus). STRs are found at loci.","ex":"Each STR marker is at its own locus"},
  {"id":"short_tandem_repeat","t":"Short tandem repeat (STR)","u":"el_dna","d":"A short sequence of DNA (for example GATA or TCTA) that is repeated multiple times in a row at a specific location (locus) on a chromosome.","ex":"GATAGATAGATA = 3 repeats"},
  {"id":"el_homozygous","t":"Homozygous","u":"el_dna","d":"Both alleles are the same size for an STR locus. On a gel, a single band shows the individual is homozygous.","ex":"Elephant 2, gene 1: 270, 270"},
  {"id":"el_heterozygous","t":"Heterozygous","u":"el_dna","d":"The two alleles are different sizes for an STR locus. On a gel, two bands show the individual is heterozygous.","ex":"Elephant 1, gene 1: 290, 270"},
  {"id":"human_activity","t":"Human activity","u":"el_cons","d":"Things people do that affect populations and their habitats, such as poaching, habitat loss and pollution. Human activity is a density-independent limiting factor.","ex":"Poaching elephants for ivory"},
  {"id":"conservation","t":"Conservation","u":"el_cons","d":"Efforts to protect species and their habitats to save them from extinction. Ecologists track population sizes to see whether conservation efforts are working.","ex":"Tracking elephant herds with collars; tracing poached ivory with DNA"},
  {"id":"extinction","t":"Extinction","u":"el_cons","d":"When a species no longer exists because its last individual has died.","ex":"Declines in population size can warn that a species is at risk"},
  {"id":"photosynthesis","t":"Photosynthesis","u":"el_photo","d":"The process that uses light energy from the sun to convert carbon dioxide and water into glucose and oxygen. Plants, algae and some bacteria use it to make their own food. 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂","ex":"Grass making food for elephants"},
  {"id":"carbon_dioxide","t":"Carbon dioxide","u":"el_photo","d":"CO₂. A reactant (ingredient) of photosynthesis and a product of cellular respiration.","ex":"6 CO₂ in the photosynthesis equation"},
  {"id":"water","t":"Water","u":"el_photo","d":"H₂O. A reactant (ingredient) of photosynthesis and a product of cellular respiration.","ex":"6 H₂O in the photosynthesis equation"},
  {"id":"glucose","t":"Glucose","u":"el_photo","d":"C₆H₁₂O₆. A sugar made by photosynthesis that stores energy in its bonds. Cells break it down in cellular respiration to make ATP, and plants use it to build cellulose (biomass).","ex":"The product plants make from sunlight"},
  {"id":"oxygen","t":"Oxygen","u":"el_photo","d":"O₂. A product of photosynthesis and a reactant (ingredient) of cellular respiration.","ex":"6 O₂ in the photosynthesis equation"},
  {"id":"light","t":"Light","u":"el_photo","d":"Light energy from the sun powers photosynthesis. It is written over the arrow in the photosynthesis equation because it is energy, not a molecule.","ex":"Sunlight hitting a leaf"},
  {"id":"el_cellular_respiration","t":"Cellular respiration","u":"el_energy","d":"The process done in all organisms, autotrophs and heterotrophs, that breaks down glucose and releases the energy stored in its bonds to produce ATP. C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP","ex":"Elephants and plants both do it"},
  {"id":"atp","t":"ATP","u":"el_energy","d":"Adenosine triphosphate: the usable form of energy that cells create from food to power essential life functions like movement, growth and repair.","ex":"Muscle cells use ATP to move"},

  // ---------- Otters (add terms here) ----------

  // ---------- Melanin (add terms here) ----------

  // ---------- Cancer (add terms here) ----------
];

// Fill-in sentences from the class notes. [word] marks a blank.
export const NOTES = [
  // ---------- Lions 1st half ----------
  {"id":"n1","u":"group","s":"In nature, many species exhibit [group] behaviors that greatly improve their chances of [surviving] and [reproducing]."},
  {"id":"n2","u":"group","s":"Group behaviors provide benefits that individual actions [cannot] achieve [alone]."},
  {"id":"n3","u":"group","s":"Schools of fish can confuse [predators] with their [coordinated] movements."},
  {"id":"n4","u":"group","s":"Cooperative hunting or [foraging] can lead to more effective [food] acquisition."},
  {"id":"n5","u":"group","s":"Predators such as wolves hunt in [packs] to catch prey that would be too difficult to take down alone."},
  {"id":"n6","u":"group","s":"Animals that [migrate] in groups can find better breeding grounds and ensure a higher survival rate for their offspring."},
  {"id":"n7","u":"group","s":"Herd animals, like elephants and buffalo, form groups to protect [vulnerable] members from predators."},
  {"id":"n8","u":"group","s":"Lions and orcas use teamwork to [hunt] more effectively and [capture] larger prey."},
  {"id":"n9","u":"group","s":"Fish that school are less likely to become prey because their collective [movement] confuses predators."},
  {"id":"n10","u":"group","s":"Migrating species, like monarch butterflies and birds, benefit from shared [navigation] and environmental cues."},
  {"id":"n11","u":"evo","s":"Phylogenetic trees show us the hypothesized relationships between different [taxa]."},
  {"id":"n12","u":"evo","s":"The relatedness of different taxa is based on physical and [genetic] characteristics."},
  {"id":"n13","u":"evo","s":"Taxa that share a more recent [common] ancestor are more closely related."},
  {"id":"n14","u":"gen","s":"Gene flow is the movement of [genes] in or out of a population. This can happen through movement of [individuals] or through the movement of gametes."},
  {"id":"n15","u":"gen","s":"Gene flow can bring [new] alleles into a population, or it can affect the frequency of existing alleles."},
  {"id":"n16","u":"gen","s":"Biological fitness is an organism’s success in surviving and [reproducing] to pass its [genes] on to the next generation."},
  {"id":"n17","u":"gen","s":"Direct fitness is passing on your genes through your own direct children, or [offspring]."},
  {"id":"n18","u":"gen","s":"Indirect fitness is passing on your genes by helping close [relatives] (who share your DNA) survive."},
  {"id":"n19","u":"gen","s":"Chromosomes are found inside the nucleus of cells and consist of long strands of [DNA]."},
  {"id":"n20","u":"gen","s":"Each [human] cell has [46] chromosomes (23 pairs)."},
  {"id":"n21","u":"gen","s":"[Gametes] (sex cells) only have 23 chromosomes."},
  {"id":"n22","u":"gen","s":"[Karyotypes] are an organized image of an individual’s chromosomes."},
  {"id":"n23","u":"gen","s":"A [gene] is a segment of DNA that codes for a [trait]."},
  {"id":"n24","u":"gen","s":"You received [two] copies of each gene, one on each chromosome: one from [mom] and one from [dad]."},
  {"id":"n25","u":"gen","s":"[Alleles] are different [versions] of a gene."},
  {"id":"n26","u":"gen","s":"If both alleles for one gene are the [same], they are [homozygous]. The root word homo means the same."},
  {"id":"n27","u":"gen","s":"If the alleles are [different], they are [heterozygous]. The root word hetero means different."},
  {"id":"n28","u":"gen","s":"[Genotype] describes the set of [genes] that an organism contains. It’s written as the combination of [letters]."},
  {"id":"n29","u":"gen","s":"[Phenotype] describes the [physical] characteristics displayed by an organism."},

  // ---------- Lions 2nd half ----------
  {"id":"n30","u":"macro","s":"Carbohydrates are for [energy] release and [storage] in the body."},
  {"id":"n31","u":"macro","s":"Simple sugars, like [glucose], can release energy [quickly] while other carbs have a [slower] release of energy."},
  {"id":"n32","u":"macro","s":"Proteins are incredibly [diverse] in their [structure], which allows them to have many [functions]."},
  {"id":"n33","u":"macro","s":"When a protein loses its [shape] and can no longer function, it [denatures]."},
  {"id":"n34","u":"macro","s":"Triglycerides are used as a [long] term store of energy. They are stored in the body as [fat], which is good for [insulation] in cold habitats."},
  {"id":"n35","u":"macro","s":"Monosaccharides are simple [sugars]. The most common of these is [glucose]."},
  {"id":"n36","u":"macro","s":"Disaccharides form when [two] monosaccharides link together in a [dehydration] synthesis reaction."},
  {"id":"n37","u":"macro","s":"Polysaccharides are [long] chains of monosaccharides. [Storage] polysaccharides store sugar, while [structural] polysaccharides help build organisms."},
  {"id":"n38","u":"macro","s":"Lipids are a type of macromolecule that are [insoluble] in water."},
  {"id":"n39","u":"macro","s":"Steroids have a basic structure of [four] rings of [carbon] atoms. They make up the basis of many [hormones]."},
  {"id":"n40","u":"macro","s":"A macromolecule is a very large [molecule] made up of smaller repeating [monomers] joined together."},
  {"id":"n41","u":"macro","s":"An atom is the basic unit of [matter]. A molecule is two or more [atoms] bonded together."},
  {"id":"n42","u":"macro","s":"Atoms from food are not [created] or [destroyed], just [rearranged] and combined to form an organism’s biomolecules."},
  {"id":"n43","u":"energy","s":"The law of conservation of energy states that energy can be neither [created] nor [destroyed]; it can only be [transferred] to another form."},
  {"id":"n44","u":"macro","s":"The left side of a reaction (what goes in) is called the [reactants], while the right side (what comes out) is called the [products]."},
  {"id":"n45","u":"macro","s":"Monomers are the repeating subunits or building [blocks] of a polymer."},
  {"id":"n46","u":"macro","s":"[Polymers] are the long chain molecules made of [monomers]."},
  {"id":"n47","u":"macro","s":"Dehydration synthesis joins monomers into a polymer by [removing] water."},
  {"id":"n48","u":"macro","s":"Hydrolysis breaks polymers into their monomers by [adding] water."},
  {"id":"n49","u":"food","s":"A food [web] illustrates all the feeding interactions in a community and is a more accurate model of how energy moves than a food [chain]."},
  {"id":"n50","u":"enz","s":"Enzymes are biological [catalysts], which means they [speed] up reactions in the body without being [used] up themselves."},
  {"id":"n51","u":"enz","s":"Enzymes lower the [activation] energy of a reaction — how much energy is required for the reaction to [start]."},
  {"id":"n52","u":"enz","s":"Most enzymes are [proteins] and have a specific [shape]."},
  {"id":"n53","u":"enz","s":"Enzymes work like a [lock] and [key]: the enzyme’s active site is perfectly [complementary] to the substrate."},
  {"id":"n54","u":"food","s":"Autotrophs make their own [food] using [light] energy for photosynthesis or [chemical] energy for chemosynthesis."},
  {"id":"n55","u":"food","s":"Producers are the start of [every] food chain."},
  {"id":"n56","u":"food","s":"Heterotrophs [consume] or eat other organisms to get chemical energy. All [animals] are consumers."},
  {"id":"n57","u":"food","s":"Decomposers break down [dead] organisms and [recycle] nutrients. [Fungi] and some bacteria are decomposers."},
  {"id":"n58","u":"food","s":"Food chains can be arranged in energy [pyramids], which have different levels called [trophic] levels."},
  {"id":"n59","u":"food","s":"Only around [10]% of energy stored as [biomass] in one trophic level ends up as biomass in the [next] trophic level."},
  {"id":"n60","u":"food","s":"Most energy is lost as [heat], which is produced during cellular [respiration]."},
  {"id":"n61","u":"food","s":"In a food chain, the arrows show the flow of [energy]."},

  // ---------- Elephants ----------
  {"id":"n62","u":"el_pop","s":"A population is a [group] of individuals that belong to the same [species], living in a given [area] at the same [time]."},
  {"id":"n63","u":"el_pop","s":"Ecologists monitor populations over time to see how they [change]. This can help them [predict] how they're likely to change in the future."},
  {"id":"n64","u":"el_pop","s":"Tracking any declines in population size can help inform [conservation] efforts to save species from [extinction]."},
  {"id":"n65","u":"el_pop","s":"[Larger] populations are more resilient to environmental [change]. Smaller populations are more at [risk] of inbreeding, genetic [mutations] and genetic drift."},
  {"id":"n66","u":"el_pop","s":"Population density is a broad measure of how [closely] packed individuals of a population are."},
  {"id":"n67","u":"el_pop","s":"Animals in a high density population are more likely to encounter a [mate] and successfully [reproduce]. However, infectious diseases can [spread] more rapidly in a high density population."},
  {"id":"n68","u":"el_pop","s":"Population dispersion patterns give us more information about how species [behave] and how distribution and abundance of environmental [resources] can affect them."},
  {"id":"n69","u":"el_pop","s":"Biotic factors are the [living] factors in an [ecosystem]. Abiotic factors are the [nonliving] factors in an ecosystem."},
  {"id":"n70","u":"el_pop","s":"Dead organisms were once [living] things, so we say they are biotic. Abiotic factors were [never] alive."},
  {"id":"n71","u":"el_pop","s":"Limiting factors are factors in a population's [environment] that limit the population [size], i.e. limit growth."},
  {"id":"n72","u":"el_pop","s":"Density-independent limiting factors are usually [abiotic] factors. They affect a population regardless of its [density]."},
  {"id":"n73","u":"el_pop","s":"Examples of density-independent limiting factors include natural [disasters], severe [weather], [pollution] and human activity."},
  {"id":"n74","u":"el_pop","s":"Density-dependent limiting factors are usually [biotic] factors. They affect population size differently depending on its [density]."},
  {"id":"n75","u":"el_pop","s":"Examples of density-dependent limiting factors include the spread of [disease] and [parasites], [competition] and [predation]."},
  {"id":"n76","u":"el_ns","s":"Not all individuals survive and reproduce, due to predators or competition for [resources]."},
  {"id":"n77","u":"el_ns","s":"Only individuals that are well [adapted] to their environment will [survive] and reproduce."},
  {"id":"n78","u":"el_ns","s":"These individuals will pass on their beneficial [traits] to their [offspring]."},
  {"id":"n79","u":"el_ns","s":"Over many [generations], the species has [evolved] so that the beneficial trait is [more] common and the less beneficial is less common or even [eliminated]."},
  {"id":"n80","u":"el_ns","s":"The four parts of VISA are [Variation], [Inheritance], differential [Survival] and reproduction, and [Adaptation]."},
  {"id":"n81","u":"el_ns","s":"Inheritance means the variation in the trait of interest is at least partially passed from [parents] to [offspring]."},
  {"id":"n82","u":"el_dna","s":"DNA profiling uses genetic [markers] to identify individuals or determine the geographic origin of a sample."},
  {"id":"n83","u":"el_dna","s":"STRs are short sequences of DNA that are [repeated] multiple times in a row at specific locations ([loci]) on a chromosome."},
  {"id":"n84","u":"el_dna","s":"An individual inherits one copy ([allele]) of the STR fragment from each [parent]. The allele is named by its number of [repeats] or length in base pairs (bp)."},
  {"id":"n85","u":"el_dna","s":"Gel electrophoresis is a technique used to [separate] DNA fragments based on their [size]."},
  {"id":"n86","u":"el_dna","s":"The fragments appear as [bands] on the gel. A [single] band indicates the individual is [homozygous] for that STR locus, while [two] bands indicate the individual is [heterozygous]."},
  {"id":"n87","u":"el_dna","s":"Smaller DNA fragments move through the gel [faster] and travel a [longer] distance than longer fragments."},
  {"id":"n88","u":"el_dna","s":"Scientists use [multiple] STR markers to create a unique genetic [profile] for an individual."},
  {"id":"n89","u":"el_dna","s":"For a match to be confirmed, the bands ([alleles]) of the evidence sample must perfectly [match] with all the corresponding bands of the suspect individual's profile across all markers."},
  {"id":"n90","u":"el_dna","s":"Populations that are geographically [distant] and have been [separated] for a longer time will have more [different] genetic profiles."},
  {"id":"n91","u":"el_dna","s":"By comparing the crime sample's alleles to the reference map, scientists can [eliminate] populations whose alleles are not [present] in the crime sample."},
  {"id":"n92","u":"el_cons","s":"Ecologists track population sizes to evaluate if conservation efforts are [working]."},
  {"id":"n93","u":"el_cons","s":"Human activity, like pollution, is a density-[independent] limiting factor."},
  {"id":"n94","u":"el_photo","s":"Photosynthesis uses [light] energy from the [sun] to convert [carbon dioxide] and [water] into [glucose] and [oxygen]."},
  {"id":"n95","u":"el_photo","s":"[Plants], [algae] and some bacteria use photosynthesis to make their own food. They are known as [autotrophs] (self-feeders)."},
  {"id":"n96","u":"el_photo","s":"Photosynthesis converts light energy into [chemical] energy stored in the bonds of organic molecules."},
  {"id":"n97","u":"el_photo","s":"Plants use the glucose from photosynthesis to build starch and [cellulose], their biomass."},
  {"id":"n98","u":"el_energy","s":"[Cellular respiration] is done in [all] organisms, both those that are [autotrophs] as well as those that need to [consume] food and are [heterotrophs]."},
  {"id":"n99","u":"el_energy","s":"In cellular respiration, [glucose] is broken down, releasing the [energy] stored in its bonds. This is used to produce [ATP]."},
  {"id":"n100","u":"el_energy","s":"ATP is the usable form of [energy] that cells create from food to power essential life functions like movement, growth and repair."},

  // ---------- Otters (add fill-in sentences here) ----------

  // ---------- Melanin (add fill-in sentences here) ----------

  // ---------- Cancer (add fill-in sentences here) ----------
];
