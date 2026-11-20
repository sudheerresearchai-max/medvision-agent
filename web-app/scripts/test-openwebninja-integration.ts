import { searchRealtimeWeb, fetchMedicalKnowledge } from '../lib/medicalKnowledge';

async function main() {
  console.log('================================================================');
  console.log('MedVision Agent — OpenWebNinja Real-Time Search Test');
  console.log('================================================================\n');

  console.log('[Test 1] Querying OpenWebNinja directly...');
  const searchResults = await searchRealtimeWeb(
    'Glioblastoma Multiforme NCCN guidelines treatment side effects precautions'
  );
  console.log(`✓ Received ${searchResults.length} organic search results.`);
  if (searchResults.length > 0) {
    console.log(`  Sample 1 Title: ${searchResults[0].title}`);
    console.log(`  Sample 1 URL:   ${searchResults[0].url}`);
    console.log(`  Sample 1 Snippet: ${searchResults[0].snippet.slice(0, 100)}...`);
  }

  console.log('\n[Test 2] Calling fetchMedicalKnowledge for Glioblastoma...');
  const brief = await fetchMedicalKnowledge({
    diagnosis: 'Glioblastoma Multiforme',
    organ: 'brain',
    hasTumor: true,
  });

  console.log(`✓ Condition: ${brief.condition}`);
  console.log(`✓ Category:  ${brief.category}`);
  console.log(`✓ Total Sources: ${brief.sources.length}`);

  const liveSources = brief.sources.filter((s) => s.isLiveWeb);
  console.log(`✓ Live Real-Time Web Sources: ${liveSources.length}`);
  liveSources.forEach((s, i) => {
    console.log(`  [${i + 1}] ${s.name} (${s.sourceType}) -> ${s.url}`);
  });

  console.log('\n[Test 3] Calling fetchMedicalKnowledge for Normal Screening Baseline...');
  const normalBrief = await fetchMedicalKnowledge({
    diagnosis: 'Normal Unremarkable Parenchyma',
    organ: 'brain',
    hasTumor: false,
  });
  console.log(`✓ Condition: ${normalBrief.condition}`);
  console.log(`✓ Total Sources: ${normalBrief.sources.length}`);

  console.log('\n================================================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
