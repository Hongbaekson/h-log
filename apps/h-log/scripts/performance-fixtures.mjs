import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPostVersionContentFromMarkdown } from '../lib/blog-content-model.ts';
import { selectPublicBrain } from '../lib/brain.ts';
import { brainCatalog } from '../lib/brain-catalog.ts';
import { mergePublishedBrain } from '../lib/brain-curation.ts';

export const BLOG_SIZES=[10,100,500,1000], BRAIN_SIZES=[28,100,300,1000];
export const FIXTURE_DATE='2026-11-01T00:00:00.000Z';
export const fingerprint=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const BUDGETS={
  list_model_cpu_ms:{ratio:1.20,allowance:2},
  request_p50_ms:{ratio:1.20,allowance:20},
  request_p95_ms:{ratio:1.25,allowance:50},
  graph_interaction_ms:{ratio:1.20,allowance:16},
  retained_heap_bytes:{ratio:1.15,allowance:1048576},
  rebuild_duration_ms:{status:'not_implemented',target_ms:60000,posts:1000,ratio:1.20,allowance:100},
};

export function statistics(values,percentile=false) {
  assert(values.length>0&&values.every(v=>Number.isFinite(v)&&v>=0),'Invalid samples');
  if(percentile)assert(values.length>=30,'p95 requires at least 30 samples');
  const sorted=[...values].sort((a,b)=>a-b),n=sorted.length;
  return {count:n,min:sorted[0],median:(sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2,
    ...(percentile?{p95:sorted[Math.ceil(n*.95)-1]}:{}),max:sorted.at(-1)};
}

const paragraph='Redis Pub/Sub 메시지 전달과 실패 처리 조건을 확인합니다. 소비자가 연결을 잃은 뒤 재처리를 어떻게 시작할지 살펴보고, PostgreSQL에 처리 상태를 보존하는 범위를 기록합니다.\n\n';
const markdown='# 합성 성능 검수 글\n\n'+Array.from({length:32},(_,i)=>`## 확인 항목 ${i+1}\n\n${paragraph}`).join('');
const publicContent=createPostVersionContentFromMarkdown(markdown);
const privateContent=createPostVersionContentFromMarkdown('PERF_PRIVATE_UNSELECTED');

export function makeBlogFixture(count) {
  assert(BLOG_SIZES.includes(count));
  const store={posts:[],versions:[],tags:[],sources:[],assets:[]};
  for(let i=0;i<count+2;i++) {
    const hidden=i>=count,id=hidden?(i===count?'perf-draft':'perf-retracted'):`perf-${String(i).padStart(4,'0')}`;
    const title=hidden?'PERF_PRIVATE_POST':`합성 검수 ${i}`,versionId=id+'-v1';
    store.posts.push({id,slug:id,title,description:'격리 환경의 성능 검수 자료',articleMode:'document_analysis',
      status:hidden?(i===count?'drafted':'retracted'):'published',currentVersionId:versionId,publishedAt:FIXTURE_DATE,
      createdAt:FIXTURE_DATE,updatedAt:FIXTURE_DATE,unpublishedAt:null,retractedAt:null});
    for(const versionNo of [1,2])store.versions.push({...(hidden||versionNo===2?privateContent:publicContent),id:`${id}-v${versionNo}`,postId:id,
      title:versionNo===2?'PERF_PRIVATE_UNSELECTED':title,description:'격리 환경의 성능 검수 자료',versionNo,createdAt:FIXTURE_DATE,createdBy:'admin',personaVersionId:null,researchPackId:null});
    for(const [index,tag] of ['PostgreSQL','Redis','성능'].entries())store.tags.push({id:`${id}-tag-${index}`,postId:id,tag,createdAt:FIXTURE_DATE});
    store.sources.push({id:id+'-source',postId:id,publisher:'PostgreSQL',researchPackId:null,sourceRole:'official',url:'https://www.postgresql.org/docs/',title:'공식 문서',fetchedAt:FIXTURE_DATE,summary:'합성 검수 출처',snapshotHash:'a'.repeat(64)});
  }
  return store;
}

export function makeBrainFixture(count) {
  assert(BRAIN_SIZES.includes(count));
  const base=selectPublicBrain(brainCatalog);assert.equal(base.nodes.length,28);assert.equal(base.edges.length,42);
  const extra=count-base.nodes.length;
  const snapshots=Array.from({length:extra},(_,i)=>({...base.nodes[i%base.nodes.length],
    id:`note-00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,title:`합성 노드 ${i}`,
    summary:'측정용 공개 사본',recordedAt:FIXTURE_DATE.slice(0,10),sources:[],questions:['다음에 확인할 조건은 무엇인가?'],
    sections:[{heading:'기록',paragraphs:[paragraph.trim()]}],links:[]}));
  for(let i=0;i<extra*1.5;i++) {
    const from=snapshots[i%extra],target=snapshots[(i+1+Math.floor(i/extra)*3)%extra];
    from.links.push({target:target.id,relation:'supports',reason:'합성 측정 연결'});
  }
  return {graph:mergePublishedBrain(base,snapshots),snapshots};
}
