<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { LocalGardenRepository } from '../adapters/local-garden.repository';
import { EMOTION_META, EMOTIONS, type Emotion } from '../core/models';
import { annualReport, createEntry, createProfile, sampleSnapshot, syncPlants } from '../core/garden-engine';

const repo = new LocalGardenRepository();
const store = reactive(repo.load());
const tab = ref<'花园' | '种植' | '时间轴' | '标本馆' | '年报'>('花园');
const selectedEmotion = ref<Emotion>('喜悦');
const notice = ref('');
const draft = reactive({ note: '', intensity: 3 });
const profileMenuOpen = ref(false);
const newProfileName = ref('');
const current = computed(() => store.profiles.find((profile) => profile.id === store.currentProfileId) ?? store.profiles[0]);
const report = computed(() => annualReport(current.value.entries));
const living = computed(() => current.value.plants.filter((plant) => plant.status === '繁茂'));
const specimens = computed(() => current.value.plants.filter((plant) => plant.status === '枯萎'));
const timeline = computed(() => [...current.value.entries].sort((a, b) => b.date.localeCompare(a.date)));
function persist() { repo.save({ profiles: store.profiles, currentProfileId: store.currentProfileId }); }
function save() { current.value.plants = syncPlants(current.value.entries, current.value.plants); persist(); }
function plant() { current.value.entries.unshift(createEntry(selectedEmotion.value, draft.note, draft.intensity)); draft.note = ''; save(); notice.value = `${EMOTION_META[selectedEmotion.value].plant} 已经种进「${current.value.name}」`; tab.value = '花园'; }
function reset() { const fresh = sampleSnapshot(); current.value.entries = fresh.entries; current.value.plants = fresh.plants; save(); notice.value = `「${current.value.name}」已恢复初始示例花园`; }
function switchProfile(id: string) {
  profileMenuOpen.value = false;
  if (id === store.currentProfileId || !store.profiles.some((profile) => profile.id === id)) return;
  store.currentProfileId = id;
  persist();
  notice.value = `已切换到「${current.value.name}」`;
}
function addProfile() {
  const profile = createProfile(newProfileName.value || `花园 ${store.profiles.length + 1}`);
  store.profiles.push(profile);
  store.currentProfileId = profile.id;
  newProfileName.value = '';
  profileMenuOpen.value = false;
  persist();
  notice.value = `新档案「${profile.name}」已创建，从现在开始记录吧`;
}
function removeProfile(id: string) {
  if (store.profiles.length <= 1) { notice.value = '至少要保留一个花园档案'; profileMenuOpen.value = false; return; }
  const index = store.profiles.findIndex((profile) => profile.id === id);
  if (index < 0) return;
  const name = store.profiles[index].name;
  if (id === store.currentProfileId) store.currentProfileId = store.profiles.find((profile) => profile.id !== id)!.id;
  store.profiles.splice(index, 1);
  profileMenuOpen.value = false;
  persist();
  notice.value = `「${name}」已删除，当前花园：「${current.value.name}」`;
}
</script>

<template>
  <div class="garden-app">
    <header class="garden-topbar"><div class="garden-brand"><span class="garden-mark">✿</span><div><span class="eyebrow">THE INNER GARDEN / 02</span><h1>情绪植物园</h1></div></div><div class="garden-top-actions"><div class="profile-switcher"><button class="profile-current" type="button" @click="profileMenuOpen = !profileMenuOpen">❀ {{ current.name }} <i>▾</i></button><div v-if="profileMenuOpen" class="profile-menu"><button v-for="profile in store.profiles" :key="profile.id" type="button" class="profile-option" :class="{ active: profile.id === store.currentProfileId }" @click="switchProfile(profile.id)"><span class="profile-name">{{ profile.id === store.currentProfileId ? '✓ ' : '' }}{{ profile.name }}</span><small>{{ profile.entries.length }} 条记录 · {{ profile.plants.filter((p) => p.status === '繁茂').length }} 株在生长</small><span v-if="store.profiles.length > 1" class="profile-delete" title="删除此档案" @click.stop="removeProfile(profile.id)">×</span></button><div class="profile-new"><input v-model="newProfileName" placeholder="新档案名称，如：工作" @keyup.enter="addProfile" /><button type="button" @click="addProfile">新建</button></div></div></div><span class="weather">今日花园 · {{ living.length }} 株在生长</span><button class="quiet-button" type="button" @click="reset">重置演示</button></div></header>
    <main class="garden-wrap"><section class="garden-hero"><div><span class="eyebrow green-text">DAILY EMOTION CULTIVATION</span><h2>给情绪一块<br /><i>可以生长的土壤。</i></h2><p>你不需要每天都阳光明媚，只需要为此刻诚实地浇一次水。</p></div><div class="garden-stats"><div><strong>{{ report.active }}</strong><span>活跃日</span></div><div><strong>{{ report.lushness }}<small>%</small></strong><span>花园繁茂度</span></div><div><strong>{{ current.entries.length }}</strong><span>情绪标本</span></div></div></section>
      <nav class="garden-tabs"><button v-for="item in ['花园', '种植', '时间轴', '标本馆', '年报']" :key="item" type="button" :class="{ active: tab === item }" @click="tab = item as typeof tab">{{ item }}</button></nav>
      <section v-if="tab === '花园'" class="garden-board"><div class="board-heading"><div><span class="eyebrow">YOUR EMOTIONAL BIOME</span><h3>正在生长的情绪</h3></div><span class="season-label">{{ current.name }} · 秋季 · 第 40 周</span></div><div class="plant-grid"><article v-for="plant in living" :key="plant.id" class="plant-card" :style="{ '--plant-color': EMOTION_META[plant.emotion].color }"><div class="plant-card-top"><span class="plant-status">正在生长</span><span>{{ plant.streak }} 天连续</span></div><div class="plant-illustration"><span class="plant-glow"></span><strong>{{ EMOTION_META[plant.emotion].symbol }}</strong><i v-for="n in Math.min(plant.streak + 1, 5)" :key="n" :style="{ '--n': n }">●</i></div><div class="plant-info"><span class="plant-emotion">{{ plant.emotion }}</span><h4>{{ EMOTION_META[plant.emotion].plant }}</h4><p>{{ EMOTION_META[plant.emotion].hint }}</p><div class="growth-track"><span :style="{ width: `${Math.min(100, Math.max(12, plant.streak / 14 * 100))}%` }"></span></div><small>{{ plant.stage }} · 下一阶段还需 {{ Math.max(0, 3 - plant.streak) }} 天</small></div></article><button class="add-plant-card" type="button" @click="tab = '种植'"><span>＋</span><strong>种下一颗新情绪</strong><small>每天记录，植物就会长大</small></button></div></section>
      <section v-else-if="tab === '种植'" class="planting-layout"><article class="plant-form"><div class="board-heading"><div><span class="eyebrow">PLANT A FEELING</span><h3>今天的你，是什么天气？</h3></div><span class="season-label">将种进「{{ current.name }}」</span></div><div class="emotion-picker"><button v-for="emotion in EMOTIONS" :key="emotion" type="button" :class="{ selected: selectedEmotion === emotion }" :style="{ '--emotion-color': EMOTION_META[emotion].color }" @click="selectedEmotion = emotion"><span>{{ EMOTION_META[emotion].symbol }}</span><b>{{ emotion }}</b><small>{{ EMOTION_META[emotion].plant }}</small></button></div><label>给这颗情绪留一句话<textarea v-model="draft.note" rows="5" placeholder="它今天为什么来到这里？"></textarea></label><label>情绪强度 <output>{{ draft.intensity }} / 5</output><input v-model.number="draft.intensity" type="range" min="1" max="5" /></label><button class="plant-button" type="button" @click="plant">种下这颗情绪 ✦</button><p class="notice">{{ notice }}</p></article><aside class="plant-preview" :style="{ '--preview-color': EMOTION_META[selectedEmotion].color }"><span class="eyebrow">PREVIEW / {{ selectedEmotion }}</span><div class="preview-plant">{{ EMOTION_META[selectedEmotion].symbol }}</div><h3>{{ EMOTION_META[selectedEmotion].plant }}</h3><p>今天种下，连续记录 3 天后发芽，7 天后开花，14 天后结果。</p></aside></section>
      <section v-else-if="tab === '时间轴'" class="timeline-section"><div class="board-heading"><div><span class="eyebrow">GROWTH TIMELINE</span><h3>每一天，都留下了一片叶子</h3></div></div><div v-if="timeline.length" class="timeline"><div v-for="(entry, index) in timeline" :key="entry.id" class="timeline-item"><div class="timeline-date"><strong>{{ new Date(`${entry.date}T00:00:00`).getDate() }}</strong><span>{{ new Date(`${entry.date}T00:00:00`).toLocaleDateString('zh-CN', { month: 'short' }) }}</span></div><div class="timeline-dot" :style="{ background: EMOTION_META[entry.emotion].color }"></div><div class="timeline-content"><div><span class="timeline-emotion" :style="{ color: EMOTION_META[entry.emotion].color }">{{ EMOTION_META[entry.emotion].symbol }} {{ entry.emotion }}</span><span class="intensity">强度 {{ entry.intensity }}/5</span></div><p>{{ entry.note }}</p><small>{{ EMOTION_META[entry.emotion].plant }} · 第 {{ index + 1 }} 片叶子</small></div></div></div><div v-else class="empty-state">「{{ current.name }}」还没有记录。种下第一颗情绪，时间轴就会开始生长。</div></section>
      <section v-else-if="tab === '标本馆'" class="specimen-section"><div class="board-heading"><div><span class="eyebrow">SPECIMEN ARCHIVE</span><h3>枯萎不是消失，是被好好保存</h3></div></div><div v-if="specimens.length" class="specimen-grid"><div v-for="plant in specimens" :key="plant.id" class="specimen-card"><div class="pressed-flower">{{ EMOTION_META[plant.emotion].symbol }}</div><div><span>{{ plant.emotion }} · {{ EMOTION_META[plant.emotion].plant }}</span><strong>生长了 {{ plant.entryIds.length }} 天</strong><small>最后浇水：{{ plant.lastWatered }}</small></div></div></div><div v-else class="empty-state">你的标本馆还是空的。持续记录，等一朵花完成它的季节。</div></section>
      <section v-else class="report-section"><div class="report-heading"><span class="eyebrow">EMOTIONAL ECOLOGY REPORT · 2026</span><h3>「{{ current.name }}」的情绪生态年报</h3><p>这一年，你和自己的内在天气相处得怎么样？</p></div><div class="report-grid"><div class="report-score"><span>花园繁茂度</span><strong>{{ report.lushness }}<small>/ 100</small></strong><div class="report-progress"><i :style="{ width: `${report.lushness}%` }"></i></div><p>每一次诚实的记录，都会让生态系统更完整。</p></div><div class="top-emotion"><span>最常出现的物种</span><div><strong :style="{ color: EMOTION_META[report.top.emotion].color }">{{ EMOTION_META[report.top.emotion].symbol }}</strong><h4>{{ report.top.emotion }}</h4></div><p>{{ report.top.count }} 次记录 · 是你今年最熟悉的一种天气</p></div><div class="count-chart"><span>情绪物种分布</span><div v-for="item in report.counts" :key="item.emotion" class="count-row"><b>{{ item.emotion }}</b><div><i :style="{ width: `${Math.max(5, item.count / Math.max(report.top.count, 1) * 100)}%`, background: EMOTION_META[item.emotion].color }"></i></div><small>{{ item.count }}</small></div></div></div></section>
    </main>
  </div>
</template>
